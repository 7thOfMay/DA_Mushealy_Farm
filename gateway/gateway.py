import sys
import time
import json
import threading
from datetime import datetime, timezone, timedelta


def utcnow():
    """Trả về thời gian UTC (khớp với MySQL Railway)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


import paho.mqtt.client as mqtt
import psycopg2
import psycopg2.extras
import psycopg2.pool
from psycopg2 import OperationalError as PgError
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
        db_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=3,
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            dbname=config.DB_NAME,
        )
        db_available = True
        print("[DB] Kết nối PostgreSQL thành công (pool)")
        # Tự động cập nhật device mapping từ DB
        _sync_device_mapping()
        return True
    except PgError as e:
        db_available = False
        print(f"[DB] Lỗi kết nối: {e}")
        return False


def _sync_device_mapping():
    """Tự động cập nhật FEED_TO_DEVICE và DEVICE_TO_FEED từ bảng devices."""
    conn = None
    try:
        conn = db_pool.getconn()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
            "DEV-PUMP-01": "V10",
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

    except Exception as e:
        print(f"[DB] Không thể đồng bộ device mapping: {e} — dùng config mặc định")
    finally:
        if conn:
            try:
                db_pool.putconn(conn)
            except Exception:
                pass


def get_db():
    """Lấy kết nối từ pool (mỗi thread dùng riêng, trả lại sau)."""
    global db_available
    try:
        if db_pool is None:
            if not _init_pool():
                return None
        conn = db_pool.getconn()
        db_available = True
        return conn
    except Exception as e:
        db_available = False
        print(f"[DB] Lỗi pool: {e}")
        return None


def _putconn(conn):
    """Trả kết nối về pool."""
    if conn and db_pool:
        try:
            db_pool.putconn(conn)
        except Exception:
            pass


def save_sensor_data(device_id, value):
    """INSERT dữ liệu cảm biến + cập nhật status trong 1 connection."""
    conn = get_db()
    if conn is None:
        save_to_offline_queue(device_id, value)
        return False
    try:
        cursor = conn.cursor()
        now = utcnow()
        cursor.execute(
            "INSERT INTO sensor_data (device_id, value, recorded_at, synced) "
            "VALUES (%s, %s, %s, TRUE)",
            (device_id, value, now),
        )
        cursor.execute(
            "UPDATE devices SET status = 'online', last_updated = %s WHERE device_id = %s",
            (now, device_id),
        )
        conn.commit()
        cursor.close()
        print(f"  → DB: Đã lưu device_id={device_id}, value={value}")
        return True
    except Exception as e:
        conn.rollback()
        print(f"  → DB ERROR: {e}")
        save_to_offline_queue(device_id, value)
        return False
    finally:
        _putconn(conn)


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
    except Exception as e:
        conn.rollback()
        print(f"  → DB ERROR (update status): {e}")
    finally:
        _putconn(conn)


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
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[SYNC] Lỗi: {e}")
    finally:
        _putconn(conn)


# ============================================================
# THRESHOLD ALERT GENERATION - Tự động tạo cảnh báo vượt ngưỡng
# ============================================================

def check_thresholds(device_id, value):
    """Kiểm tra giá trị cảm biến vượt ngưỡng, tự động tạo alert."""
    conn = get_db()
    if conn is None:
        return
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # 1. Lấy zone_id và device_type_id
        cursor.execute(
            "SELECT d.zone_id, d.device_type_id, dt.type_name, fz.zone_name "
            "FROM devices d "
            "JOIN device_types dt ON d.device_type_id = dt.device_type_id "
            "JOIN farm_zones fz ON d.zone_id = fz.zone_id "
            "WHERE d.device_id = %s",
            (device_id,),
        )
        device_info = cursor.fetchone()
        if not device_info:
            cursor.close()
            return

        zone_id = device_info["zone_id"]
        device_type_id = device_info["device_type_id"]
        zone_name = device_info["zone_name"]

        # 2. Map device_type → metric_type
        metric_type = config.DEVICE_TYPE_TO_METRIC.get(device_type_id)
        if not metric_type:
            cursor.close()
            return

        # 3. Lấy ngưỡng
        cursor.execute(
            "SELECT min_value, max_value FROM zone_thresholds "
            "WHERE zone_id = %s AND metric_type = %s",
            (zone_id, metric_type),
        )
        threshold = cursor.fetchone()
        if not threshold:
            cursor.close()
            return

        min_val = float(threshold["min_value"])
        max_val = float(threshold["max_value"])

        # 4. Kiểm tra vượt ngưỡng
        if min_val <= value <= max_val:
            cursor.close()
            return  # Trong ngưỡng bình thường

        # 5. Check cooldown - tránh tạo alert liên tục
        cursor.execute(
            "SELECT alert_id FROM alerts "
            "WHERE zone_id = %s AND metric_type = %s "
            "AND status IN ('detected', 'processing') "
            "AND detected_at > NOW() - INTERVAL '%s seconds'",
            (zone_id, metric_type, config.ALERT_COOLDOWN_SECONDS),
        )
        if cursor.fetchone():
            cursor.close()
            return  # Đã có alert gần đây, bỏ qua

        # 6. Xác định severity
        exceeded_by = 0
        threshold_range = max_val - min_val if max_val > min_val else 1
        if value > max_val:
            exceeded_by = (value - max_val) / threshold_range
            threshold_value = max_val
            direction = "cao"
        else:
            exceeded_by = (min_val - value) / threshold_range
            threshold_value = min_val
            direction = "thấp"

        severity = "critical" if exceeded_by > 0.2 else "warning"

        # 7. Tạo thông báo
        metric_labels = {
            "temperature": "Nhiệt độ",
            "air_humidity": "Độ ẩm không khí",
            "soil_moisture": "Độ ẩm đất",
            "light": "Ánh sáng",
        }
        metric_units = {
            "temperature": "°C",
            "air_humidity": "%",
            "soil_moisture": "%",
            "light": "lux",
        }
        label = metric_labels.get(metric_type, metric_type)
        unit = metric_units.get(metric_type, "")
        message = (
            f"{label} quá {direction} tại {zone_name}: "
            f"{value}{unit} (ngưỡng: {min_val}-{max_val}{unit})"
        )

        # 8. Insert alert
        now = utcnow()
        cursor.execute(
            "INSERT INTO alerts "
            "(zone_id, device_id, alert_type, source_type, severity, "
            " metric_type, threshold_value, actual_value, message, status, detected_at) "
            "VALUES (%s, %s, 'threshold_exceeded', 'threshold_rule', %s, "
            " %s, %s, %s, %s, 'detected', %s)",
            (zone_id, device_id, severity, metric_type,
             threshold_value, value, message, now),
        )

        # 9. Log vào system_logs
        cursor.execute(
            "INSERT INTO system_logs "
            "(user_id, action_type, entity_type, entity_id, description, created_at) "
            "VALUES (NULL, 'alert', 'alert', currval('alerts_alert_id_seq'), %s, %s)",
            (message, now),
        )

        conn.commit()
        cursor.close()
        print(f"  🚨 ALERT [{severity.upper()}]: {message}")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"  ⚠️ Threshold check error: {e}")
    finally:
        _putconn(conn)


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

            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"[CMD] DB Error: {e}")
        finally:
            _putconn(conn)

        time.sleep(config.COMMAND_POLL_INTERVAL)


# ============================================================
# SCHEDULE EVALUATION - Thực thi lịch trình tự động
# ============================================================

def evaluate_schedules(mqtt_client):
    """Đánh giá và thực thi lịch trình tưới tiêu tự động."""
    while True:
        conn = None
        try:
            conn = get_db()
            if conn is None:
                time.sleep(config.SCHEDULE_EVAL_INTERVAL)
                continue

            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            now = utcnow()
            current_time = now.time()
            current_weekday = now.weekday()  # 0=Monday

            # Lấy tất cả lịch trình active
            cursor.execute(
                "SELECT s.*, d.device_code "
                "FROM schedules s "
                "JOIN devices d ON s.device_id = d.device_id "
                "WHERE s.is_active = TRUE"
            )
            schedules = cursor.fetchall()

            for sched in schedules:
                schedule_id = sched["schedule_id"]
                device_id = sched["device_id"]
                execution_mode = sched["execution_mode"]
                last_triggered = sched.get("last_triggered_at")

                # Cooldown: không trigger lại trong vòng duration + 60s
                duration = sched.get("duration_seconds") or 300
                cooldown = duration + 60
                if last_triggered:
                    elapsed = (now - last_triggered).total_seconds()
                    if elapsed < cooldown:
                        continue

                should_trigger = False

                # --- TIME-BASED (automatic) ---
                if execution_mode == "automatic" and sched.get("start_time"):
                    start = sched["start_time"]
                    schedule_type = sched.get("schedule_type", "daily")

                    # Kiểm tra thời gian: trong phạm vi SCHEDULE_EVAL_INTERVAL giây
                    time_diff_seconds = abs(
                        (current_time.hour * 3600 + current_time.minute * 60 + current_time.second)
                        - (start.hour * 3600 + start.minute * 60 + start.second)
                    )

                    if time_diff_seconds <= config.SCHEDULE_EVAL_INTERVAL:
                        if schedule_type == "daily":
                            should_trigger = True
                        elif schedule_type == "weekly":
                            dow = sched.get("day_of_week")
                            if dow is not None and dow == current_weekday:
                                should_trigger = True
                        elif schedule_type == "hourly":
                            # Hourly: trigger mỗi giờ tại phút start_time.minute
                            if abs(current_time.minute - start.minute) <= 1:
                                should_trigger = True

                # --- THRESHOLD-BASED ---
                elif execution_mode == "threshold_based":
                    zone_id = sched["zone_id"]

                    # Lấy ngưỡng tưới từ watering_modes
                    cursor.execute(
                        "SELECT trigger_threshold_soil_moisture FROM watering_modes "
                        "WHERE zone_id = %s AND mode = 'auto_sensor'",
                        (zone_id,),
                    )
                    wm = cursor.fetchone()
                    if not wm or not wm["trigger_threshold_soil_moisture"]:
                        continue

                    threshold_moisture = float(wm["trigger_threshold_soil_moisture"])

                    # Lấy giá trị soil moisture mới nhất của zone
                    cursor.execute(
                        "SELECT sd.value FROM sensor_data sd "
                        "JOIN devices d ON sd.device_id = d.device_id "
                        "JOIN device_types dt ON d.device_type_id = dt.device_type_id "
                        "WHERE d.zone_id = %s AND dt.device_type_id = 3 "
                        "ORDER BY sd.recorded_at DESC LIMIT 1",
                        (zone_id,),
                    )
                    soil_data = cursor.fetchone()
                    if soil_data and float(soil_data["value"]) < threshold_moisture:
                        should_trigger = True

                if not should_trigger:
                    continue

                # --- TRIGGER: tạo device command ---
                print(f"  📅 SCHEDULE [{schedule_id}]: Kích hoạt thiết bị device_id={device_id} ({duration}s)")

                # Insert lệnh bật
                cursor.execute(
                    "INSERT INTO device_commands (device_id, command_type, parameters, status, issued_at) "
                    "VALUES (%s, 'turn_on', %s, 'pending', %s)",
                    (device_id, json.dumps({"source": "schedule", "schedule_id": schedule_id}), now),
                )

                # Insert lệnh tắt (sau duration giây)
                off_time = now + timedelta(seconds=duration)
                cursor.execute(
                    "INSERT INTO device_commands (device_id, command_type, parameters, status, issued_at) "
                    "VALUES (%s, 'turn_off', %s, 'pending', %s)",
                    (device_id, json.dumps({"source": "schedule", "schedule_id": schedule_id, "auto_off": True}), off_time),
                )

                # Cập nhật last_triggered_at
                cursor.execute(
                    "UPDATE schedules SET last_triggered_at = %s WHERE schedule_id = %s",
                    (now, schedule_id),
                )

                # Log
                cursor.execute(
                    "INSERT INTO system_logs "
                    "(user_id, action_type, entity_type, entity_id, description, created_at) "
                    "VALUES (NULL, 'device_control', 'schedule', %s, %s, %s)",
                    (schedule_id, f"Lịch trình #{schedule_id} kích hoạt tưới tự động ({duration}s)", now),
                )

            conn.commit()
            cursor.close()

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"[SCHEDULE] Error: {e}")
        finally:
            _putconn(conn)

        time.sleep(config.SCHEDULE_EVAL_INTERVAL)


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
            # Kiểm tra ngưỡng và tạo cảnh báo tự động
            check_thresholds(device_id, value)
        except ValueError:
            print(f"  ⚠️ Bỏ qua: payload '{payload}' không phải số")
        return

    # ----- ACTUATOR FEEDBACK: cập nhật trạng thái -----
    if feed_id in ("v10", "v11"):
        for dev_id, fkey in config.DEVICE_TO_FEED.items():
            if fkey.lower() == feed_id:
                status = "active" if payload.strip() == "1" else "online"
                update_device_status(dev_id, status)
                conn = get_db()
                if conn:
                    try:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE device_commands SET status = 'executed', executed_at = %s "
                            "WHERE device_id = %s AND status = 'sent' "
                            "AND command_id = (SELECT command_id FROM device_commands WHERE device_id = %s AND status = 'sent' ORDER BY issued_at DESC LIMIT 1)",
                            (utcnow(), dev_id, dev_id),
                        )
                        conn.commit()
                        cursor.close()
                    except Exception as e:
                        conn.rollback()
                        print(f"  ⚠️ DB ERROR (cmd update): {e}")
                    finally:
                        _putconn(conn)
                break


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 50)
    print("  🌱 NôngTech IoT Gateway")
    print("  OhStem MQTT ↔ PostgreSQL")
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

    # Chạy thread đánh giá lịch trình tự động
    sched_thread = threading.Thread(target=evaluate_schedules, args=(client,), daemon=True)
    sched_thread.start()
    print("📅 Schedule evaluation thread đã khởi động")

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

