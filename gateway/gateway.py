import sys
import time
import json
import threading
from datetime import datetime
from Adafruit_IO import MQTTClient
import mysql.connector
from mysql.connector import Error as MySQLError
import config

# ============================================================
# DATABASE HELPERS
# ============================================================

db_connection = None
db_available = False


def get_db():
    """Lấy hoặc tạo kết nối MySQL tới Railway."""
    global db_connection, db_available
    try:
        if db_connection and db_connection.is_connected():
            return db_connection
        db_connection = mysql.connector.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
        )
        db_available = True
        print("[DB] Kết nối Railway MySQL thành công")
        return db_connection
    except MySQLError as e:
        db_available = False
        print(f"[DB] Lỗi kết nối: {e}")
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
            (device_id, value, datetime.now()),
        )
        conn.commit()
        cursor.close()
        print(f"  → DB: Đã lưu device_id={device_id}, value={value}")
        return True
    except MySQLError as e:
        print(f"  → DB ERROR: {e}")
        save_to_offline_queue(device_id, value)
        return False


def update_device_status(device_id, status="online"):
    """Cập nhật trạng thái thiết bị khi nhận được data."""
    conn = get_db()
    if conn is None:
        return
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE devices SET status = %s, last_updated = %s WHERE device_id = %s",
            (status, datetime.now(), device_id),
        )
        conn.commit()
        cursor.close()
    except MySQLError as e:
        print(f"  → DB ERROR (update status): {e}")


# ============================================================
# OFFLINE QUEUE - Lưu tạm khi mất kết nối DB
# ============================================================

def save_to_offline_queue(device_id, value):
    """Lưu data vào file local khi không kết nối được DB."""
    record = {
        "device_id": device_id,
        "value": float(value),
        "recorded_at": datetime.now().isoformat(),
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
                    datetime.now(),
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


# ============================================================
# COMMAND POLLING - Lấy lệnh điều khiển từ DB gửi lên Adafruit
# ============================================================

def poll_device_commands(mqtt_client):
    """Poll bảng device_commands, gửi lệnh pending lên Adafruit IO."""
    while True:
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
                        (datetime.now(), cmd["command_id"]),
                    )
                    continue

                # Xác định payload gửi lên Adafruit IO
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

                # Gửi lên Adafruit IO
                try:
                    mqtt_client.publish(feed_key, payload_value)
                    print(f"[CMD] Đã gửi: {feed_key} = {payload_value} (command_id={cmd['command_id']})")
                    cursor.execute(
                        "UPDATE device_commands SET status = 'sent', executed_at = %s "
                        "WHERE command_id = %s",
                        (datetime.now(), cmd["command_id"]),
                    )
                except Exception as e:
                    print(f"[CMD] Lỗi gửi Adafruit: {e}")
                    cursor.execute(
                        "UPDATE device_commands SET status = 'failed', executed_at = %s "
                        "WHERE command_id = %s",
                        (datetime.now(), cmd["command_id"]),
                    )

            conn.commit()
            cursor.close()

        except MySQLError as e:
            print(f"[CMD] DB Error: {e}")
        except Exception as e:
            print(f"[CMD] Error: {e}")

        time.sleep(config.COMMAND_POLL_INTERVAL)


# ============================================================
# ADAFRUIT IO MQTT CALLBACKS
# ============================================================

def connected(client):
    print("[MQTT] Kết nối Adafruit IO thành công!")
    print("-" * 50)
    for feed_key in config.AIO_FEED_ID.keys():
        client.subscribe(feed_key)
        print(f"  Subscribed: {config.AIO_FEED_ID[feed_key]} (Key: {feed_key})")
    print("-" * 50)

    # Thử kết nối DB khi MQTT sẵn sàng
    get_db()


def subscribe(client, userdata, mid, granted_qos):
    print("[MQTT] Subscribe thành công")


def disconnected(client):
    print("[MQTT] Mất kết nối Adafruit IO!")
    # Không exit ngay, thử reconnect
    time.sleep(5)


def message(client, feed_id, payload):
    """Xử lý message từ Adafruit IO."""
    name = config.AIO_FEED_ID.get(feed_id, feed_id)
    print(f"[{name}] ({feed_id}): {payload}")

    # ----- SENSOR DATA: lưu vào DB -----
    device_id = config.FEED_TO_DEVICE.get(feed_id)
    if device_id is not None:
        try:
            value = float(payload)
            save_sensor_data(device_id, value)
            update_device_status(device_id, "online")
        except ValueError:
            print(f"  → Bỏ qua: payload '{payload}' không phải số")
        return

    # ----- ACTUATOR FEEDBACK: cập nhật trạng thái -----
    # Khi thiết bị điều khiển phản hồi (VD: pump đã bật/tắt)
    if feed_id in ("v10", "v11"):
        # Tìm device_id từ DEVICE_TO_FEED (reverse lookup)
        for dev_id, fkey in config.DEVICE_TO_FEED.items():
            if fkey == feed_id:
                update_device_status(dev_id, "online")
                # Cập nhật command đã executed
                conn = get_db()
                if conn:
                    try:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE device_commands SET status = 'executed', executed_at = %s "
                            "WHERE device_id = %s AND status = 'sent' "
                            "ORDER BY issued_at DESC LIMIT 1",
                            (datetime.now(), dev_id),
                        )
                        conn.commit()
                        cursor.close()
                    except MySQLError as e:
                        print(f"  → DB ERROR (cmd update): {e}")
                break


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 50)
    print("  NôngTech IoT Gateway")
    print("  Adafruit IO ↔ Railway MySQL")
    print("=" * 50)

    # Khởi tạo MQTT Client
    mqtt_client = MQTTClient(config.AIO_USERNAME, config.AIO_KEY)
    mqtt_client.on_connect = connected
    mqtt_client.on_disconnect = disconnected
    mqtt_client.on_message = message
    mqtt_client.on_subscribe = subscribe

    # Chạy thread poll lệnh điều khiển từ DB
    cmd_thread = threading.Thread(target=poll_device_commands, args=(mqtt_client,), daemon=True)
    cmd_thread.start()
    print("[GATEWAY] Command polling thread đã khởi động")

    try:
        mqtt_client.connect()
        mqtt_client.loop_blocking()
    except KeyboardInterrupt:
        print("\n[GATEWAY] Đang dừng...")
    except Exception as e:
        print(f"[GATEWAY] Lỗi: {e}")
    finally:
        global db_connection
        if db_connection and db_connection.is_connected():
            db_connection.close()
            print("[DB] Đã đóng kết nối MySQL")
        print("[GATEWAY] Đã dừng!")


if __name__ == "__main__":
    main()

