import os

# --- ADAFRUIT IO ACCOUNT CONFIGURATION ---
AIO_USERNAME = os.getenv("AIO_USERNAME", "")
AIO_KEY = os.getenv("AIO_KEY", "")

# --- RAILWAY MYSQL DATABASE ---
DB_HOST = os.getenv("DB_HOST", "")          # VD: abc.proxy.rlwy.net
DB_PORT = int(os.getenv("DB_PORT", "3306"))  # VD: 12345
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "railway")

# --- MAPPING FEED → TÊN HIỂN THỊ ---
AIO_FEED_ID = {
    "v1": "Temperature",
    "v2": "Humidity",
    "v3": "Soil Moisture",
    "v4": "LUX",
    "v5": "GDD",
    "v10": "Pump 1",
    "v11": "Pump 2",
}

# --- MAPPING FEED → device_id TRONG DATABASE ---
# Chỉnh device_id cho khớp với bảng devices trong DB của bạn
FEED_TO_DEVICE = {
    "v1": 1,   # DEV-TEMP-01  (Cảm biến nhiệt độ KV1)
    "v2": 2,   # DEV-AIR-01   (Cảm biến độ ẩm không khí KV1)
    "v3": 3,   # DEV-SOIL-01  (Cảm biến độ ẩm đất KV1)
    "v4": 4,   # DEV-LIGHT-01 (Cảm biến ánh sáng KV1)
}

# --- MAPPING device_id → FEED cho điều khiển (actuator) ---
# Khi có lệnh từ DB, gửi lên Adafruit IO feed tương ứng
DEVICE_TO_FEED = {
    5: "v10",  # DEV-PUMP-01 → Pump 1
    6: "v11",  # DEV-PUMP-02 → Pump 2  (hoặc chỉnh lại theo thiết bị thực)
}

# --- CẤU HÌNH GATEWAY ---
COMMAND_POLL_INTERVAL = 5   # Giây - tần suất poll lệnh từ DB
OFFLINE_QUEUE_FILE = "offline_queue.json"  # File lưu tạm khi mất kết nối DB