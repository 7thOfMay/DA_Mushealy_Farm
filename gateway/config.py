import os
from pathlib import Path
from urllib.parse import unquote, urlparse
from dotenv import load_dotenv

# Load .env.local từ project root (local dev), sau đó .env (fallback)
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env.local", override=False)
load_dotenv(_root / ".env",       override=False)
load_dotenv(override=False)  # gateway/.env nếu có

# --- 1. CẤU HÌNH SERVER OHSTEM ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "mqtt.ohstem.vn")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "SmartFarm")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# --- POSTGRESQL DATABASE ---
# Gateway là long-running process → ưu tiên URL non-pooling để tránh timeout pooler
DATABASE_URL = (
    os.getenv("DATABASE_URL_UNPOOLED")        # Neon non-pooling (ưu tiên nhất)
    or os.getenv("POSTGRES_URL_NON_POOLING")   # Neon alias
    or os.getenv("DATABASE_URL")               # fallback pooled
    or os.getenv("POSTGRES_URL")
    or os.getenv("POSTGRESQL_URL")
)

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    DB_HOST = parsed.hostname or ""
    DB_PORT = int(parsed.port or 5432)
    DB_USER = unquote(parsed.username or "postgres")
    DB_PASSWORD = unquote(parsed.password or "")
    DB_NAME = (parsed.path or "/smart_farm").lstrip("/")
else:
    DB_HOST = os.getenv("DB_HOST", "")          # VD: abc.proxy.rlwy.net
    DB_PORT = int(os.getenv("DB_PORT", "5432"))  # PostgreSQL default
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "smart_farm")

DB_SSLMODE = os.getenv("DB_SSLMODE", "require")
DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
POSTGRES_URL = DATABASE_URL or (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# --- COREIOT ---
COREIOT_URL = "https://app.coreiot.io"
COREIOT_TOKEN = "1omr8yulbsmbyugm9yof"

# --- MAPPING FEED → TÊN HIỂN THỊ ---
# Keys are lowercase (used for matching incoming messages after .lower())
FEEDS = {
    "v1": "Temperature",
    "v2": "Humidity",
    "v3": "Soil Moisture",
    "v4": "LUX",
    "v5": "GDD",
    "v10": "Pump 1",
}

# --- MAPPING FEED → device_id TRONG DATABASE ---
# Keys are lowercase (matched after .lower() in on_message)
FEED_TO_DEVICE = {
    "v1": 1,    # Cảm biến nhiệt độ KV1  (device_id=9)
    "v2": 2,   # Cảm biến độ ẩm không khí KV1  (device_id=10)
    "v3": 3,   # Cảm biến độ ẩm đất KV1  (device_id=11)
    "v4": 4,   # Cảm biến ánh sáng KV1  (device_id=12)
    "temperature": 1,
    "humidity": 2,
    "soil": 3,
    "light": 4,
    "pump_status": 5,
    "light_status": 8,
}

# --- MAPPING device_id → FEED cho điều khiển (actuator) ---
# Values are UPPERCASE (OhStem MQTT topics are case-sensitive)
DEVICE_TO_FEED = {
    13: "V10",   # Máy bơm KV1  (device_id=13)
}

# --- CẤU HÌNH GATEWAY ---
COMMAND_POLL_INTERVAL = 3   # Giây - tần suất poll lệnh từ DB
OFFLINE_QUEUE_FILE = "offline_queue.json"

# --- CẤU HÌNH CẢNH BÁO TỰ ĐỘNG ---
ALERT_COOLDOWN_SECONDS = 900  # 15 phút - khoảng cách tối thiểu giữa 2 alert cùng zone+metric

# device_type_id → metric_type trong zone_thresholds
DEVICE_TYPE_TO_METRIC = {
    1: "temperature",
    2: "air_humidity",
    3: "soil_moisture",
    4: "light",
}

# --- CẤU HÌNH LỊCH TRÌNH TỰ ĐỘNG ---
SCHEDULE_EVAL_INTERVAL = 30  # Giây - tần suất đánh giá lịch trình