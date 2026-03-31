import sys
import time
import json
import threading
from datetime import datetime, timezone


def utcnow():
    """Trả về thời gian UTC (khớp với MySQL Railway)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


import paho.mqtt.client as mqtt
import mysql.connector
from mysql.connector import Error as MySQLError
from mysql.connector.pooling import MySQLConnectionPool
import config

# ============================================================
# DATABASE HELPERS  (connection pool — thread-safe)
# ============================================================

db_pool = None
db_available = False


def _init_pool():
    """Khởi tạo connection pool (gọi 1 lần)."""
    global db_pool, db_available
    if db_pool is not None:
        return True
    try:
        db_pool = MySQLConnectionPool(
            pool_name="gateway",
            pool_size=3,
            pool_reset_session=True,
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
            ssl_disabled=True,
        )
        db_available = True
        print("[DB] Kết nối Railway MySQL thành công (pool)")
        # Tự động cập nhật device mapping từ DB
        _sync_device_mapping()
        return True
    except MySQLError as e:
        db_available = False
        print(f"[DB] Lỗi kết nối: {e}")
        return False


def _sync_device_mapping():
    """Tự động cập nhật FEED_TO_DEVICE và DEVICE_TO_FEED từ bảng devices."""
    conn = None
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT d.device_id, d.device_code, dt.category "
            "FROM devices d "
            "JOIN device_types dt ON d.device_type_id = dt.device_type_id "
            "WHERE d.zone_id = (SELECT MIN(zone_id) FROM farm_zones) "
            "ORDER BY d.device_type_id"
        )
        rows = cursor.fetchall()
        cursor.close()

        # Map device_code → feed key
        CODE_TO_FEED = {
            "DEV-TEMP-01": "v1",
            "DEV-AIR-01": "v2",
            "DEV-SOIL-01": "v3",
            "DEV-LIGHT-01": "v4",
        }
        CODE_TO_ACTUATOR_FEED = {
            "DEV-PUMP-01": "v10",
        }

        updated_sensor = {}
        updated_actuator = {}
        for row in rows:
            code = row["device_code"]
            did = row["device_id"]
            if code in CODE_TO_FEED:
                updated_sensor[CODE_TO_FEED[code]] = did
            if code in CODE_TO_ACTUATOR_FEED:
                updated_actuator[did] = CODE_TO_ACTUATOR_FEED[code]

        if updated_sensor:
            config.FEED_TO_DEVICE.update(updated_sensor)
            print(f"[DB] Đã đồng bộ FEED_TO_DEVICE: {config.FEED_TO_DEVICE}")
        if updated_actuator:
            config.DEVICE_TO_FEED.clear()
            config.DEVICE_TO_FEED.update(updated_actuator)
            print(f"[DB] Đã đồng bộ DEVICE_TO_FEED: {config.DEVICE_TO_FEED}")

    except MySQLError as e:
        print(f"[DB] Không thể đồng bộ device mapping: {e} — dùng config mặc định")
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def get_db():
    """Lấy kết nối từ pool (mỗi thread dùng riêng, trả lại sau)."""
    global db_available
    try:
        if db_pool is None:
            if not _init_pool():
                return None
        conn = db_pool.get_connection()
        db_available = True
        return conn
    except MySQLError as e:
        db_available = False
        # Pool chưa sẵn sàng → thử tạo lại
        print(f"[DB] Lỗi pool: {e}")
        return None


def save_sensor_data(device_id, value):
    """INSERT dữ liệu cảm biến vào bảng sensor_data."""
    conn = get_db()
    if conn is None:
        save_to_offline_queue(device_id, value)
        return False
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sensor_data (device_id, value, recorded_at, synced) "
            "VALUES (%s, %s, %s, TRUE)",
            (device_id, value, utcnow()),
        )
        conn.commit()
        cursor.close()
        print(f"  → DB: Đã lưu device_id={device_id}, value={value}")
        return True
    except MySQLError as e:
        print(f"  → DB ERROR: {e}")
        save_to_offline_queue(device_id, value)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def update_device_status(device_id, status="online"):
    """Cập nhật trạng thái thiết bị khi nhận được data."""
    conn = get_db()
    if conn is None:
        return
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET status = %s, last_updated = %s WHERE device_id = %s",
            (status, utcnow(), device_id),
        )
        conn.commit()
        cursor.close()
    except MySQLError as e:
        print(f"  → DB ERROR (update status): {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ============================================================
# OFFLINE QUEUE - Lưu tạm khi mất kết nối DB
# ============================================================

def save_to_offline_queue(device_id, value):
    """Lưu data vào file local khi không kết nối được DB."""
    record = {
        "device_id": device_id,
        "value": float(value),
        "recorded_at": utcnow().isoformat(),
    }
    try:
        try:
            with open(config.OFFLINE_QUEUE_FILE, "r") as f:
                queue = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            queue = []
        queue.append(record)
        with open(config.OFFLINE_QUEUE_FILE, "w") as f:
            json.dump(queue, f, indent=2)
        print(f"  → OFFLINE: Đã lưu tạm ({len(queue)} bản ghi chờ sync)")
    except Exception as e:
        print(f"  → OFFLINE ERROR: {e}")


def sync_offline_queue():
    """Đồng bộ dữ liệu offline lên DB khi có kết nối trở lại."""
    try:
        with open(config.OFFLINE_QUEUE_FILE, "r") as f:
            queue = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return

    if not queue:
        return

    conn = get_db()
    if conn is None:
        return

    print(f"[SYNC] Đang đồng bộ {len(queue)} bản ghi offline...")
    synced = 0
    try:
        cursor = conn.cursor()
        for record in queue:
            cursor.execute(
                "INSERT INTO gateway_sync_queue (device_id, payload, recorded_at, synced, synced_at) "
                "VALUES (%s, %s, %s, TRUE, %s)",
                (
                    record["device_id"],
                    json.dumps(record),
                    record["recorded_at"],
                    utcnow(),
                ),
            )
            cursor.execute(
                "INSERT INTO sensor_data (device_id, value, recorded_at, synced) "
                "VALUES (%s, %s, %s, TRUE)",
                (record["device_id"], record["value"], record["recorded_at"]),
            )
            synced += 1
        conn.commit()
        cursor.close()
        # Xóa file queue sau khi sync xong
        with open(config.OFFLINE_QUEUE_FILE, "w") as f:
            json.dump([], f)
        print(f"[SYNC] Đã đồng bộ thành công {synced}/{len(queue)} bản ghi")
    except MySQLError as e:
        print(f"[SYNC] Lỗi: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ============================================================
# COMMAND POLLING - Lấy lệnh điều khiển từ DB gửi lên OhStem
# ============================================================

def poll_device_commands(mqtt_client):
    """Poll bảng device_commands, gửi lệnh pending lên OhStem MQTT."""
    while True:
        conn = None
        try:
            conn = get_db()
            if conn is None:
                time.sleep(config.COMMAND_POLL_INTERVAL)
                continue

            # Thử sync offline queue trước
            sync_offline_queue()

            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT dc.command_id, dc.device_id, dc.command_type, dc.parameters "
                "FROM device_commands dc "
                "WHERE dc.status = 'pending' "
                "ORDER BY dc.issued_at ASC"
            )
            commands = cursor.fetchall()

            for cmd in commands:
                device_id = cmd["device_id"]
                feed_key = config.DEVICE_TO_FEED.get(device_id)

                if feed_key is None:
                    print(f"[CMD] Không tìm thấy feed cho device_id={device_id}, bỏ qua")
                    cursor.execute(
                        "UPDATE device_commands SET status = 'failed', executed_at = %s "
                        "WHERE command_id = %s",
                        (utcnow(), cmd["command_id"]),
                    )
                    continue

                # Xác định payload
                params = cmd["parameters"]
                if isinstance(params, str):
                    params = json.loads(params)

                if cmd["command_type"] in ("power_on", "turn_on", "open"):
                    payload_value = "1"
                elif cmd["command_type"] in ("power_off", "turn_off", "close"):
                    payload_value = "0"
                elif params and "value" in params:
                    payload_value = str(params["value"])
                else:
                    payload_value = "1"

                # Gửi lên OhStem MQTT
                topic = f"{config.MQTT_USERNAME}/feeds/{feed_key}"
                try:
                    mqtt_client.publish(topic, payload_value)
                    print(f"[CMD] Đã gửi: {topic} = {payload_value} (command_id={cmd['command_id']})")
                    cursor.execute(
                        "UPDATE device_commands SET status = 'sent', executed_at = %s "
                        "WHERE command_id = %s",
                        (utcnow(), cmd["command_id"]),
                    )
                except Exception as e:
                    print(f"[CMD] Lỗi gửi MQTT: {e}")
                    cursor.execute(
                        "UPDATE device_commands SET status = 'failed', executed_at = %s "
                        "WHERE command_id = %s",
                        (utcnow(), cmd["command_id"]),
                    )

            conn.commit()
            cursor.close()

        except MySQLError as e:
            print(f"[CMD] DB Error: {e}")
        except Exception as e:
            print(f"[CMD] Error: {e}")
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

        time.sleep(config.COMMAND_POLL_INTERVAL)


# ============================================================
# PAHO MQTT CALLBACKS (OhStem)
# ============================================================

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Đã kết nối thành công với máy chủ OhStem!")
        print("-" * 50)

        # Dùng '#' để lắng nghe TẤT CẢ feeds của username
        topic = f"{config.MQTT_USERNAME}/#"
        client.subscribe(topic)
        print(f"📡 Subscribed: {topic}")

        for feed_key, name in config.FEEDS.items():
            print(f"  🔗 {name} → {config.MQTT_USERNAME}/feeds/{feed_key}")
        print("-" * 50)

        # Thử kết nối DB khi MQTT sẵn sàng
        _init_pool()
    else:
        print(f"❌ Kết nối thất bại. Mã lỗi: {rc}")


def on_disconnect(client, userdata, rc):
    print("❌ Đã ngắt kết nối khỏi máy chủ OhStem!")


def on_message(client, userdata, msg):
    """Xử lý message từ OhStem MQTT."""
    # Topic format: SmartFarm/feeds/V1 → lấy feed_key = "v1" (lowercase)
    topic = msg.topic
    parts = topic.split("/")
    feed_id = (parts[-1] if len(parts) >= 3 else topic).lower()
    payload = msg.payload.decode("utf-8", errors="ignore")

    name = config.FEEDS.get(feed_id, feed_id)
    print(f"🎯 [{name}] ({topic}): {payload}")

    # ----- SENSOR DATA: lưu vào DB -----
    device_id = config.FEED_TO_DEVICE.get(feed_id)
    if device_id is not None:
        try:
            value = float(payload)
            save_sensor_data(device_id, value)
            update_device_status(device_id, "online")
        except ValueError:
            print(f"  ⚠️ Bỏ qua: payload '{payload}' không phải số")
        return

    # ----- ACTUATOR FEEDBACK: cập nhật trạng thái -----
    if feed_id in ("v10", "v11"):
        for dev_id, fkey in config.DEVICE_TO_FEED.items():
            if fkey == feed_id:
                update_device_status(dev_id, "online")
                conn = get_db()
                if conn:
                    try:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE device_commands SET status = 'executed', executed_at = %s "
                            "WHERE device_id = %s AND status = 'sent' "
                            "ORDER BY issued_at DESC LIMIT 1",
                            (utcnow(), dev_id),
                        )
                        conn.commit()
                        cursor.close()
                    except MySQLError as e:
                        print(f"  ⚠️ DB ERROR (cmd update): {e}")
                    finally:
                        try:
                            conn.close()
                        except Exception:
                            pass
                break


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 50)
    print("  🌱 NôngTech IoT Gateway")
    print("  OhStem MQTT ↔ Railway MySQL")
    print("=" * 50)

    # Khởi tạo DB pool sớm
    _init_pool()

    # Khởi tạo paho MQTT Client
    client = mqtt.Client()
    client.username_pw_set(config.MQTT_USERNAME, config.MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    # Chạy thread poll lệnh điều khiển từ DB
    cmd_thread = threading.Thread(target=poll_device_commands, args=(client,), daemon=True)
    cmd_thread.start()
    print("⚙️ Command polling thread đã khởi động")

    print(f"Đang tiến hành kết nối tới {config.MQTT_BROKER}...")

    try:
        client.connect(config.MQTT_BROKER, config.MQTT_PORT, keepalive=60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n🛑 Đã dừng Gateway an toàn!")
    except Exception as e:
        print(f"⚠️ Đã xảy ra lỗi hệ thống: {e}")
    finally:
        client.disconnect()


if __name__ == "__main__":
    main()

