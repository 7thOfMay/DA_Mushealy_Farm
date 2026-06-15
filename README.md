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
<!-- - **AI chẩn đoán cây trồng** — upload ảnh phát hiện bệnh & phân loại trái cây -->
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
| IoT Edge OS | C++ trên nền tảng Hệ điều hành thời gian thực FreeRTOS |
| Cloud MQTT Broker | CoreIoT (`app.coreiot.io`) |
| Cloud Routing Engine | CoreIoT Rule Chain (JavaScript Filters, REST API Call Webhooks)
| Deployment | Vercel (web app) + Docker Compose (full stack) |

---

## Kiến trúc hệ thống

```
    ┌────────────────────────────────────────────────────────┐
    │                    IOT DEVICE LAYER                    │
    │                 [Yolo:Bit ESP32 Nodes]                 │
    └───────────────────────────┬────────────────────────────┘
                                │ ▲
  Uplink: Publish Telemetry     │ │ Downlink: Real-time RPC
  (MQTT JSON / Port 1883)       ▼ │ (MQTT Sub / JSON)
    ┌───────────────────────────┴────────────────────────────┐
    │                CLOUD INTERMEDIATE LAYER                │
    │    [CoreIoT Cloud Broker & Gateway (app.coreiot.io)]   │
    └───────────────────────────┬────────────────────────────┘
                                │ ▲
     HTTP POST Webhook          │ │ Downlink Control Command
     (Event-Driven Trigger)     │ │ HTTP POST (JSON Payload)
                                ▼ │
    ┌───────────────────────────┴────────────────────────────┐
    │                     BACKEND LAYER                      │
    │     [Next.js API Routes (Hạ tầng Serverless Vercel)]   │
    └───────────────────────────┬────────────────────────────┘
                                │ ▲
             SQL Ghi dữ liệu    │ │ Query / Fetch Telemetry
             (Insert Direct)    │ │ RESTful API HTTP Requests
                                ▼ │
    ┌───────────────────────────┴────────────────────────────┐
    │                 DATA & FRONTEND LAYER                  │
    │  [Neon DB (PostgreSQL)]  ◄───►  [React Web Application]│
    │  (Cloud Database Server)         (Giao diện điều khiển)│
    └────────────────────────────────────────────────────────┘
```

**Luồng dữ liệu:**
Hệ thống vận hành hoàn toàn dựa trên cơ chế hướng sự kiện (*Event-Driven*) thời gian thực, loại bỏ hoàn toàn các vòng lặp quét cơ sở dữ liệu tuần tự (Polling) trung gian để tối ưu hóa hiệu năng:

1. **Thu thập và Đẩy dữ liệu (Uplink Telemetry):** Mạch Yolo:Bit (ESP32) định kỳ sau mỗi 10 giây thu thập thông số từ các cảm biến, đóng gói tập trung vào một chuỗi JSON duy nhất và Publish lên CoreIoT Broker qua topic `v1/devices/me/telemetry`.
2. **Định tuyến và Chuyển tiếp (Cloud Gateway Webhook):** Bộ cấu hình Rule Chain trên CoreIoT tiếp nhận gói tin, bóc tách dữ liệu và kích hoạt tức thời khối `REST API Call` dưới dạng một Webhook HTTP POST bắn thẳng sang API Serverless backend (`/api/telemetry`) triển khai trên đám mây Vercel.
3. **Ghi cơ sở dữ liệu & Phản hồi UI:** Next.js API Routes trên Vercel phân tích payload nhận được từ Webhook, thực thi câu lệnh SQL ghi trực tiếp bản ghi vào đám mây Neon DB (PostgreSQL). Giao diện người dùng Web (React) sẽ gọi API định kỳ để kéo thông số mới về hiển thị lên biểu đồ.
4. **Điều khiển tức thời thời gian thực (Downlink RPC):** Khi người dùng bật/tắt thiết bị trên giao diện Web UI, ứng dụng phát yêu cầu HTTP POST đến Next.js API để ghi nhật ký, đồng thời API kích hoạt ngay một lệnh gọi RPC dội thẳng sang CoreIoT Broker. CoreIoT ngay lập tức đẩy lệnh MQTT xuống topic `v1/devices/me/rpc/request/+` của mạch mà không cần thông qua bất kỳ vòng lặp quét DB nào.

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
