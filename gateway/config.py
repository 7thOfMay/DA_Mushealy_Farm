import os

# --- 1. CẤU HÌNH SERVER OHSTEM ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "mqtt.ohstem.vn")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "SmartFarm")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# --- RAILWAY MYSQL DATABASE ---
DB_HOST = os.getenv("DB_HOST", "")          # VD: abc.proxy.rlwy.net
DB_PORT = int(os.getenv("DB_PORT", "3306"))  # VD: 12345
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "railway")

# --- MAPPING FEED → TÊN HIỂN THỊ ---
FEEDS = {
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
    "v1": 1,   # Cảm biến nhiệt độ
    "v2": 2,   # Cảm biến độ ẩm không khí
    "v3": 3,   # Cảm biến độ ẩm đất
    "v4": 4,   # Cảm biến ánh sáng
}

# --- MAPPING device_id → FEED cho điều khiển (actuator) ---
DEVICE_TO_FEED = {
    5: "v10",  # Pump 1
    6: "v11",  # Pump 2
}

# --- CẤU HÌNH GATEWAY ---
COMMAND_POLL_INTERVAL = 5   # Giây - tần suất poll lệnh từ DB
OFFLINE_QUEUE_FILE = "offline_queue.json"