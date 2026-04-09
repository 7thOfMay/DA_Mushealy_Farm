# Mushealy — Smart Farm Management System

Hệ thống quản lý nông trại thông minh tích hợp IoT, xây dựng bằng **Next.js 14**, **PostgreSQL**, **MQTT** và **Python Gateway**.

> Đồ án thiết kế hệ thống giám sát & điều khiển nông trại từ xa qua Internet.

---

## Tổng quan

Mushealy là nền tảng quản lý nông trại thông minh cho phép:

- **Giám sát cảm biến realtime** — nhiệt độ, độ ẩm không khí, độ ẩm đất, ánh sáng (lux)
- **Điều khiển thiết bị từ xa** — máy bơm, quạt, đèn, van nước qua MQTT
- **Cảnh báo tự động** — thiết lập ngưỡng cảnh báo cho từng loại cảm biến
- **Lịch tưới tiêu** — lên lịch tự động hoặc theo ngưỡng cảm biến
- **AI chẩn đoán cây trồng** — upload ảnh phát hiện bệnh & phân loại trái cây
- **Quản lý đa nông trại** — phân cấp Nông trại → Khu vực → Thiết bị
- **Phân quyền** — ADMIN (quản lý toàn hệ thống) / FARMER (quản lý nông trại được gán)
- **Sao lưu & phục hồi dữ liệu**
- **Nhật ký hệ thống** (audit log)

---

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| State Management | Zustand (localStorage persistence), TanStack React Query |
| UI Components | Radix UI, Recharts, Framer Motion, Lucide Icons |
| Backend API | Next.js API Routes |
| Database | PostgreSQL 16 (Neon trên Vercel / Docker local) |
| IoT Gateway | Python 3.11, paho-mqtt |
| MQTT Broker | OhStem (`mqtt.ohstem.vn`) |
| Deployment | Vercel (web app) + Docker Compose (full stack) |

---

## Kiến trúc hệ thống

```
┌──────────────┐     MQTT      ┌──────────────────┐     SQL      ┌────────────┐
│  IoT Devices │ ◄──────────►  │  Python Gateway   │ ◄──────────► │ PostgreSQL │
│  (Yolo:Bit)  │               │  (paho-mqtt)      │              │            │
└──────────────┘               └──────────────────┘              └─────┬──────┘
                                                                       │
                                                                       │ SQL
                                                                       │
                                                                 ┌─────▼──────┐
                                                                 │  Next.js   │
                                                                 │  API Routes│
                                                                 └─────┬──────┘
                                                                       │
                                                                       │ REST
                                                                       │
                                                                 ┌─────▼──────┐
                                                                 │  React UI  │
                                                                 │  (Browser) │
                                                                 └────────────┘
```

**Luồng dữ liệu:**
1. Cảm biến IoT gửi dữ liệu qua MQTT đến OhStem broker
2. Python Gateway nhận dữ liệu, lưu vào PostgreSQL
3. Next.js API đọc DB, trả dữ liệu cho frontend hiển thị
4. Người dùng bật/tắt thiết bị trên UI → API ghi lệnh vào DB → Gateway poll lệnh → publish MQTT → thiết bị thực thi

---

## Cấu trúc dự án

```
DA_Mushealy_Farm/
├── database/
│   └── schema.sql              # Schema PostgreSQL (33 bảng) + seed data
├── gateway/
│   ├── gateway.py              # MQTT gateway chính
│   ├── config.py               # Cấu hình MQTT & mapping feeds
│   ├── Dockerfile
│   └── requirements.txt
├── src/
│   ├── app/
│   │   ├── (auth)/             # Trang login, pending activation
│   │   ├── (dashboard)/        # Trang chính: farms, devices, schedules, alerts, AI...
│   │   └── api/                # API routes (farms, devices, sensors, alerts, ...)
│   ├── components/             # UI components (Sidebar, SensorChart, AlertPanel, ...)
│   ├── hooks/                  # Custom hooks (useAuth, useApiHydration)
│   ├── lib/
│   │   ├── db.ts               # PostgreSQL connection pool
│   │   ├── store.ts            # Zustand store
│   │   ├── api/queries.ts      # SQL queries
│   │   └── ...
│   ├── types/                  # TypeScript interfaces
│   └── middleware.ts           # Auth & route protection
├── docker-compose.yml          # 3 services: db, app, gateway
├── Dockerfile                  # Multi-stage build Next.js
└── package.json
```

---

## Cài đặt & Chạy

### Yêu cầu

- Node.js 18+
- PostgreSQL 16+ (hoặc Docker)
- Python 3.11+ (cho IoT Gateway)

### 1. Clone & cài dependencies

```bash
git clone https://github.com/<your-username>/DA_Mushealy_Farm.git
cd DA_Mushealy_Farm
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục gốc:

```env
# PostgreSQL
POSTGRES_URL=postgresql://user:password@localhost:5432/smart_farm

# Auth provider: "local" (mock, không cần backend) hoặc "supabase"
NEXT_PUBLIC_AUTH_PROVIDER=local
```

Cho IoT Gateway, tạo file `.env` trong thư mục `gateway/`:

```env
MQTT_BROKER=mqtt.ohstem.vn
MQTT_PORT=1883
MQTT_USERNAME=SmartFarm
MQTT_PASSWORD=

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=smart_farm
```

### 3. Khởi tạo database

```bash
psql -U postgres -d smart_farm -f database/schema.sql
```

### 4. Chạy ứng dụng

```bash
# Chạy Next.js dev server
npm run dev

# Chạy IoT Gateway (terminal riêng)
cd gateway
pip install -r requirements.txt
python gateway.py
```

Mở [http://localhost:3000](http://localhost:3000) để truy cập.

### Hoặc chạy bằng Docker Compose (full stack)

```bash
docker compose up -d
```

Lệnh trên sẽ khởi chạy 3 service: PostgreSQL, Next.js app, và MQTT Gateway.

---

## Tài khoản demo

| Username | Email | Mật khẩu | Vai trò |
|---|---|---|---|
| admin01 | admin@smartfarm.local | 123456 | Quản trị hệ thống |
| farmer01 | farmer1@smartfarm.local | 123456 | Nông hộ 1 |
| user01 | user1@smartfarm.local | 123456 | Người dùng 1 |

---

## IoT — MQTT Feeds

| Feed | Hướng | Thiết bị | Mô tả |
|---|---|---|---|
| `V1` | Sensor → DB | Nhiệt kế | Nhiệt độ không khí (°C) |
| `V2` | Sensor → DB | Cảm biến độ ẩm | Độ ẩm không khí (%) |
| `V3` | Sensor → DB | Cảm biến đất | Độ ẩm đất (%) |
| `V4` | Sensor → DB | Cảm biến ánh sáng | Cường độ sáng (lux) |
| `V10` | DB → Actuator | Máy bơm | Bật/tắt (1/0) |

---

## Deployment

### Vercel (Web App)

Dự án đã được cấu hình deploy trên Vercel với Neon PostgreSQL:

```bash
vercel --prod
```

### Docker (Full Stack)

```bash
docker compose up -d --build
```

Services:
- `db` — PostgreSQL 16 (port 5432)
- `app` — Next.js (port 3000)
- `gateway` — Python MQTT Gateway

---

## Scripts

```bash
npm run dev       # Chạy development server
npm run build     # Build production
npm run start     # Chạy production server
npm run lint      # Kiểm tra linting
```
