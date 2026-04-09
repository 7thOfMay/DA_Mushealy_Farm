-- ============================================================
-- DATABASE: Smart Farm Device Management System (PostgreSQL)
-- Hệ thống quản lý thiết bị nông trại thông minh
-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS gateway_sync_queue CASCADE;
DROP TABLE IF EXISTS agricultural_reports CASCADE;
DROP TABLE IF EXISTS data_restorations CASCADE;
DROP TABLE IF EXISTS data_backups CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS ai_detection_events CASCADE;
DROP TABLE IF EXISTS watering_modes CASCADE;
DROP TABLE IF EXISTS automation_rule_actions CASCADE;
DROP TABLE IF EXISTS automation_rule_conditions CASCADE;
DROP TABLE IF EXISTS automation_rules CASCADE;
DROP TABLE IF EXISTS alert_handling_logs CASCADE;
DROP TABLE IF EXISTS alert_actions CASCADE;
DROP TABLE IF EXISTS alert_rule_conditions CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS sensor_daily_statistics CASCADE;
DROP TABLE IF EXISTS sensor_data_archive CASCADE;
DROP TABLE IF EXISTS sensor_data CASCADE;
DROP TABLE IF EXISTS zone_thresholds CASCADE;
DROP TABLE IF EXISTS device_commands CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS device_capabilities CASCADE;
DROP TABLE IF EXISTS device_types CASCADE;
DROP TABLE IF EXISTS user_zone_access CASCADE;
DROP TABLE IF EXISTS farm_user_access CASCADE;
DROP TABLE IF EXISTS farm_zones CASCADE;
DROP TABLE IF EXISTS farms CASCADE;
DROP TABLE IF EXISTS plant_types CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- Helper: auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    role_id         SERIAL PRIMARY KEY,
    role_name       VARCHAR(30) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    user_id          SERIAL PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    email            VARCHAR(100) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(100),
    phone            VARCHAR(20),
    role_id          INT NOT NULL REFERENCES roles(role_id),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 3. USER_SESSIONS
-- ============================================================
CREATE TABLE user_sessions (
    session_id       SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(user_id),
    token            VARCHAR(512) NOT NULL UNIQUE,
    login_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMP NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address       VARCHAR(45),
    user_agent       VARCHAR(512)
);

-- ============================================================
-- 4. FARMS
-- ============================================================
CREATE TABLE farms (
    farm_id          SERIAL PRIMARY KEY,
    farm_code        VARCHAR(50) NOT NULL UNIQUE,
    farm_name        VARCHAR(100) NOT NULL,
    owner_name       VARCHAR(100),
    location_desc    VARCHAR(255),
    area_m2          DECIMAL(12,2),
    status           VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_farms_updated_at BEFORE UPDATE ON farms FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 5. FARM_USER_ACCESS
-- ============================================================
CREATE TABLE farm_user_access (
    user_id          INT NOT NULL REFERENCES users(user_id),
    farm_id          INT NOT NULL REFERENCES farms(farm_id),
    granted_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    granted_by       INT REFERENCES users(user_id),
    PRIMARY KEY (user_id, farm_id)
);

-- ============================================================
-- 6. PLANT_TYPES
-- ============================================================
CREATE TABLE plant_types (
    plant_type_id                      SERIAL PRIMARY KEY,
    plant_name                         VARCHAR(100) NOT NULL UNIQUE,
    description                        TEXT,
    default_temp_min                   DECIMAL(5,2),
    default_temp_max                   DECIMAL(5,2),
    default_air_humidity_min           DECIMAL(5,2),
    default_air_humidity_max           DECIMAL(5,2),
    default_soil_moisture_min          DECIMAL(5,2),
    default_soil_moisture_max          DECIMAL(5,2),
    default_light_min                  DECIMAL(10,2),
    default_light_max                  DECIMAL(10,2),
    default_watering_interval_minutes  INT,
    default_watering_duration_seconds  INT,
    created_at                         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_plant_types_updated_at BEFORE UPDATE ON plant_types FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 7. FARM_ZONES
-- ============================================================
CREATE TABLE farm_zones (
    zone_id            SERIAL PRIMARY KEY,
    farm_id            INT NOT NULL REFERENCES farms(farm_id),
    zone_name          VARCHAR(100) NOT NULL,
    plant_type_id      INT REFERENCES plant_types(plant_type_id),
    area_m2            DECIMAL(10,2),
    location_desc      VARCHAR(255),
    status             VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_farm_zones_updated_at BEFORE UPDATE ON farm_zones FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 8. USER_ZONE_ACCESS
-- ============================================================
CREATE TABLE user_zone_access (
    user_id           INT NOT NULL REFERENCES users(user_id),
    zone_id           INT NOT NULL REFERENCES farm_zones(zone_id),
    granted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    granted_by        INT REFERENCES users(user_id),
    PRIMARY KEY (user_id, zone_id)
);

-- ============================================================
-- 9. DEVICE_TYPES
-- ============================================================
CREATE TABLE device_types (
    device_type_id    SERIAL PRIMARY KEY,
    type_name         VARCHAR(50) NOT NULL UNIQUE,
    category          VARCHAR(20) NOT NULL CHECK (category IN ('sensor','actuator')),
    unit              VARCHAR(20),
    description       VARCHAR(255)
);

-- ============================================================
-- 10. DEVICE_CAPABILITIES
-- ============================================================
CREATE TABLE device_capabilities (
    capability_id     SERIAL PRIMARY KEY,
    device_type_id    INT NOT NULL REFERENCES device_types(device_type_id),
    capability_name   VARCHAR(100) NOT NULL,
    description       VARCHAR(255)
);

-- ============================================================
-- 11. DEVICES
-- ============================================================
CREATE TABLE devices (
    device_id          SERIAL PRIMARY KEY,
    device_code        VARCHAR(50) NOT NULL UNIQUE,
    device_name        VARCHAR(100) NOT NULL,
    device_type_id     INT NOT NULL REFERENCES device_types(device_type_id),
    zone_id            INT NOT NULL REFERENCES farm_zones(zone_id),
    install_location   VARCHAR(255),
    is_controllable    BOOLEAN NOT NULL DEFAULT FALSE,
    status             VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','error','active')),
    last_updated       TIMESTAMP,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. SENSOR_DATA
-- ============================================================
CREATE TABLE sensor_data (
    sensor_data_id     BIGSERIAL PRIMARY KEY,
    device_id          INT NOT NULL REFERENCES devices(device_id),
    value              DECIMAL(10,2) NOT NULL,
    recorded_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    synced             BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_sensor_device_time ON sensor_data (device_id, recorded_at);

-- ============================================================
-- 13. SENSOR_DATA_ARCHIVE
-- ============================================================
CREATE TABLE sensor_data_archive (
    sensor_data_id     BIGINT PRIMARY KEY,
    device_id          INT NOT NULL REFERENCES devices(device_id),
    value              DECIMAL(10,2) NOT NULL,
    recorded_at        TIMESTAMP NOT NULL,
    synced             BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_archive_device_time ON sensor_data_archive (device_id, recorded_at);

-- ============================================================
-- 14. SENSOR_DAILY_STATISTICS
-- ============================================================
CREATE TABLE sensor_daily_statistics (
    stat_id            BIGSERIAL PRIMARY KEY,
    device_id          INT NOT NULL REFERENCES devices(device_id),
    stat_date          DATE NOT NULL,
    min_value          DECIMAL(10,2),
    max_value          DECIMAL(10,2),
    avg_value          DECIMAL(10,2),
    total_records      INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (device_id, stat_date)
);

-- ============================================================
-- 15. ZONE_THRESHOLDS
-- ============================================================
CREATE TABLE zone_thresholds (
    threshold_id       SERIAL PRIMARY KEY,
    zone_id            INT NOT NULL REFERENCES farm_zones(zone_id),
    metric_type        VARCHAR(30) NOT NULL CHECK (metric_type IN ('temperature','air_humidity','soil_moisture','light')),
    min_value          DECIMAL(10,2),
    max_value          DECIMAL(10,2),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (zone_id, metric_type)
);
CREATE TRIGGER set_zone_thresholds_updated_at BEFORE UPDATE ON zone_thresholds FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 16. ALERT_RULES
-- ============================================================
CREATE TABLE alert_rules (
    alert_rule_id      SERIAL PRIMARY KEY,
    rule_name          VARCHAR(100) NOT NULL,
    plant_type_id      INT REFERENCES plant_types(plant_type_id),
    zone_id            INT REFERENCES farm_zones(zone_id),
    severity           VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
    message_template   VARCHAR(255) NOT NULL,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by         INT REFERENCES users(user_id),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 17. ALERT_RULE_CONDITIONS
-- ============================================================
CREATE TABLE alert_rule_conditions (
    condition_id       SERIAL PRIMARY KEY,
    alert_rule_id      INT NOT NULL REFERENCES alert_rules(alert_rule_id),
    metric_type        VARCHAR(30) NOT NULL CHECK (metric_type IN ('temperature','air_humidity','soil_moisture','light')),
    operator           VARCHAR(10) NOT NULL CHECK (operator IN ('>','>=','<','<=','=','between')),
    value1             DECIMAL(10,2) NOT NULL,
    value2             DECIMAL(10,2),
    logical_group      VARCHAR(20) NOT NULL DEFAULT 'AND'
);

-- ============================================================
-- 18. ALERT_ACTIONS
-- ============================================================
CREATE TABLE alert_actions (
    alert_action_id    SERIAL PRIMARY KEY,
    alert_rule_id      INT NOT NULL REFERENCES alert_rules(alert_rule_id),
    action_type        VARCHAR(30) NOT NULL CHECK (action_type IN ('notify','turn_on_device','turn_off_device','create_ticket')),
    target_device_id   INT REFERENCES devices(device_id),
    action_params      JSONB
);

-- ============================================================
-- 19. ALERTS
-- ============================================================
CREATE TABLE alerts (
    alert_id           SERIAL PRIMARY KEY,
    zone_id            INT NOT NULL REFERENCES farm_zones(zone_id),
    device_id          INT REFERENCES devices(device_id),
    alert_rule_id      INT REFERENCES alert_rules(alert_rule_id),
    alert_type         VARCHAR(30) NOT NULL CHECK (alert_type IN ('threshold_exceeded','plant_anomaly','fruit_classification','system','rule_based')),
    source_type        VARCHAR(30) NOT NULL DEFAULT 'threshold_rule' CHECK (source_type IN ('threshold_rule','ai_detection','system','manual')),
    severity           VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
    metric_type        VARCHAR(30) CHECK (metric_type IN ('temperature','air_humidity','soil_moisture','light')),
    threshold_value    DECIMAL(10,2),
    actual_value       DECIMAL(10,2),
    message            TEXT NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected','processing','resolved')),
    acknowledged_by    INT REFERENCES users(user_id),
    resolved_by        INT REFERENCES users(user_id),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    acknowledged_at    TIMESTAMP,
    resolved_at        TIMESTAMP
);

-- ============================================================
-- 20. ALERT_HANDLING_LOGS
-- ============================================================
CREATE TABLE alert_handling_logs (
    handling_log_id    SERIAL PRIMARY KEY,
    alert_id           INT NOT NULL REFERENCES alerts(alert_id),
    handled_by         INT NOT NULL REFERENCES users(user_id),
    action_taken       VARCHAR(255) NOT NULL,
    notes              TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 21. DEVICE_COMMANDS
-- ============================================================
CREATE TABLE device_commands (
    command_id         SERIAL PRIMARY KEY,
    device_id          INT NOT NULL REFERENCES devices(device_id),
    command_type       VARCHAR(50) NOT NULL,
    parameters         JSONB,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','executed','failed')),
    issued_by          INT REFERENCES users(user_id),
    issued_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    executed_at        TIMESTAMP
);

-- ============================================================
-- 22. SCHEDULES
-- ============================================================
CREATE TABLE schedules (
    schedule_id        SERIAL PRIMARY KEY,
    zone_id            INT NOT NULL REFERENCES farm_zones(zone_id),
    device_id          INT NOT NULL REFERENCES devices(device_id),
    execution_mode     VARCHAR(30) NOT NULL DEFAULT 'automatic' CHECK (execution_mode IN ('manual','automatic','threshold_based')),
    schedule_type      VARCHAR(20) CHECK (schedule_type IN ('hourly','daily','weekly')),
    start_time         TIME,
    end_time           TIME,
    day_of_week        SMALLINT,
    duration_seconds   INT,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by         INT REFERENCES users(user_id),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    last_triggered_at  TIMESTAMP
);
CREATE TRIGGER set_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 23. WATERING_MODES
-- ============================================================
CREATE TABLE watering_modes (
    watering_mode_id                   SERIAL PRIMARY KEY,
    zone_id                            INT NOT NULL UNIQUE REFERENCES farm_zones(zone_id),
    mode                               VARCHAR(20) NOT NULL DEFAULT 'auto_sensor' CHECK (mode IN ('auto_sensor','scheduled','manual')),
    trigger_threshold_soil_moisture    DECIMAL(5,2),
    updated_at                         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_watering_modes_updated_at BEFORE UPDATE ON watering_modes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 24. AUTOMATION_RULES
-- ============================================================
CREATE TABLE automation_rules (
    automation_rule_id  SERIAL PRIMARY KEY,
    rule_name           VARCHAR(100) NOT NULL,
    zone_id             INT NOT NULL REFERENCES farm_zones(zone_id),
    plant_type_id       INT REFERENCES plant_types(plant_type_id),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INT NOT NULL DEFAULT 1,
    created_by          INT REFERENCES users(user_id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 25. AUTOMATION_RULE_CONDITIONS
-- ============================================================
CREATE TABLE automation_rule_conditions (
    condition_id         SERIAL PRIMARY KEY,
    automation_rule_id   INT NOT NULL REFERENCES automation_rules(automation_rule_id),
    metric_type          VARCHAR(30) NOT NULL CHECK (metric_type IN ('temperature','air_humidity','soil_moisture','light')),
    operator             VARCHAR(10) NOT NULL CHECK (operator IN ('>','>=','<','<=','=','between')),
    value1               DECIMAL(10,2) NOT NULL,
    value2               DECIMAL(10,2),
    logical_group        VARCHAR(20) NOT NULL DEFAULT 'AND'
);

-- ============================================================
-- 26. AUTOMATION_RULE_ACTIONS
-- ============================================================
CREATE TABLE automation_rule_actions (
    action_id            SERIAL PRIMARY KEY,
    automation_rule_id   INT NOT NULL REFERENCES automation_rules(automation_rule_id),
    device_id            INT NOT NULL REFERENCES devices(device_id),
    command_type         VARCHAR(50) NOT NULL,
    parameters           JSONB,
    execution_order      INT NOT NULL DEFAULT 1
);

-- ============================================================
-- 27. AI_DETECTION_EVENTS
-- ============================================================
CREATE TABLE ai_detection_events (
    event_id             SERIAL PRIMARY KEY,
    zone_id              INT NOT NULL REFERENCES farm_zones(zone_id),
    detection_type       VARCHAR(30) NOT NULL CHECK (detection_type IN ('plant_anomaly','fruit_classification')),
    image_path           VARCHAR(500) NOT NULL,
    result_label         VARCHAR(100) NOT NULL,
    confidence           DECIMAL(5,4),
    details              JSONB,
    alert_id             INT REFERENCES alerts(alert_id),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    detected_by_user     INT REFERENCES users(user_id)
);

-- ============================================================
-- 28. SYSTEM_LOGS
-- ============================================================
CREATE TABLE system_logs (
    log_id               BIGSERIAL PRIMARY KEY,
    user_id              INT REFERENCES users(user_id),
    action_type          VARCHAR(30) NOT NULL CHECK (action_type IN ('device_toggle','config_change','alert','user_access','schedule_change','system_event','rule_change','backup_restore')),
    entity_type          VARCHAR(50) NOT NULL,
    entity_id            INT,
    description          TEXT NOT NULL,
    value_before         JSONB,
    value_after          JSONB,
    ip_address           VARCHAR(45),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logs_action_time ON system_logs (action_type, created_at);
CREATE INDEX idx_logs_entity ON system_logs (entity_type, entity_id);

-- ============================================================
-- 29. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    notification_id      SERIAL PRIMARY KEY,
    user_id              INT NOT NULL REFERENCES users(user_id),
    alert_id             INT REFERENCES alerts(alert_id),
    channel              VARCHAR(20) NOT NULL CHECK (channel IN ('dashboard','web_push','mobile_push')),
    title                VARCHAR(200) NOT NULL,
    body                 TEXT NOT NULL,
    is_read              BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at              TIMESTAMP
);

-- ============================================================
-- 30. DATA_BACKUPS
-- ============================================================
CREATE TABLE data_backups (
    backup_id            SERIAL PRIMARY KEY,
    backup_type          VARCHAR(20) NOT NULL CHECK (backup_type IN ('auto','manual')),
    schedule_type        VARCHAR(20) CHECK (schedule_type IN ('daily','weekly')),
    file_path            VARCHAR(500) NOT NULL,
    file_size_bytes      BIGINT,
    status               VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed')),
    created_by           INT REFERENCES users(user_id),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMP,
    notes                TEXT
);

-- ============================================================
-- 31. DATA_RESTORATIONS
-- ============================================================
CREATE TABLE data_restorations (
    restore_id           SERIAL PRIMARY KEY,
    backup_id            INT NOT NULL REFERENCES data_backups(backup_id),
    restored_by          INT NOT NULL REFERENCES users(user_id),
    status               VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed')),
    started_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMP,
    notes                TEXT
);

-- ============================================================
-- 32. AGRICULTURAL_REPORTS
-- ============================================================
CREATE TABLE agricultural_reports (
    report_id            SERIAL PRIMARY KEY,
    zone_id              INT NOT NULL REFERENCES farm_zones(zone_id),
    report_type          VARCHAR(40) NOT NULL CHECK (report_type IN ('growth_analysis','environment_analysis','harvest_recommendation','seasonal_summary')),
    date_from            DATE NOT NULL,
    date_to              DATE NOT NULL,
    content              JSONB NOT NULL,
    export_file_path     VARCHAR(500),
    generated_by         INT REFERENCES users(user_id),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 33. GATEWAY_SYNC_QUEUE
-- ============================================================
CREATE TABLE gateway_sync_queue (
    sync_id              BIGSERIAL PRIMARY KEY,
    device_id            INT NOT NULL REFERENCES devices(device_id),
    payload              JSONB NOT NULL,
    recorded_at          TIMESTAMP NOT NULL,
    synced               BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at            TIMESTAMP
);
CREATE INDEX idx_sync_pending ON gateway_sync_queue (synced, recorded_at);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
('Admin', 'Quản trị viên toàn quyền hệ thống'),
('Farmer', 'Người quản lý nông trại/khu vườn'),
('User', 'Người dùng thông thường, xem và điều khiển khu vực được chỉ định');

INSERT INTO users (username, email, password_hash, full_name, phone, role_id) VALUES
('admin01', 'admin@smartfarm.local', '$2y$10$adminhash', 'Quản trị hệ thống', '0900000001', 1),
('farmer01', 'farmer1@smartfarm.local', '$2y$10$farmerhash1', 'Nông hộ 1', '0900000002', 2),
('user01', 'user1@smartfarm.local', '$2y$10$userhash1', 'Người dùng 1', '0900000003', 3);

INSERT INTO farms (farm_code, farm_name, owner_name, location_desc, area_m2) VALUES
('FARM001', 'Nông trại Trung tâm', 'Nông hộ 1', 'Quảng Trị - Khu A', 5000.00),
('FARM002', 'Nông trại Thực nghiệm', 'Nông hộ 1', 'Quảng Trị - Khu B', 3200.00);

INSERT INTO farm_user_access (user_id, farm_id, granted_by) VALUES
(2, 1, 1), (2, 2, 1), (3, 1, 1);

INSERT INTO plant_types (
    plant_name, description,
    default_temp_min, default_temp_max,
    default_air_humidity_min, default_air_humidity_max,
    default_soil_moisture_min, default_soil_moisture_max,
    default_light_min, default_light_max,
    default_watering_interval_minutes, default_watering_duration_seconds
) VALUES
('Cải xanh', 'Rau cải xanh', 18.00, 30.00, 60.00, 80.00, 50.00, 75.00, 10000.00, 40000.00, 360, 120),
('Cà chua', 'Cà chua trồng ngoài trời', 20.00, 35.00, 50.00, 70.00, 40.00, 65.00, 15000.00, 50000.00, 480, 180),
('Nha đam', 'Nha đam (Aloe vera)', 15.00, 40.00, 30.00, 50.00, 20.00, 40.00, 20000.00, 60000.00, 1440, 60);

INSERT INTO farm_zones (farm_id, zone_name, plant_type_id, area_m2, location_desc) VALUES
(1, 'Khu vườn 1', 1, 500.00, 'Phía Bắc nông trại Trung tâm - Cải xanh'),
(1, 'Khu vườn 2', 2, 800.00, 'Phía Đông nông trại Trung tâm - Cà chua'),
(2, 'Khu vườn 3', 3, 300.00, 'Phía Nam nông trại Thực nghiệm - Nha đam');

INSERT INTO user_zone_access (user_id, zone_id, granted_by) VALUES
(2, 1, 1), (2, 2, 1), (2, 3, 1), (3, 1, 1);

INSERT INTO device_types (type_name, category, unit, description) VALUES
('Cảm biến nhiệt độ', 'sensor', '°C', 'Đo nhiệt độ không khí'),
('Cảm biến độ ẩm không khí', 'sensor', '%', 'Đo độ ẩm không khí'),
('Cảm biến độ ẩm đất', 'sensor', '%', 'Đo độ ẩm đất'),
('Cảm biến ánh sáng', 'sensor', 'lux', 'Đo cường độ ánh sáng'),
('Máy bơm nước', 'actuator', NULL, 'Bơm nước tưới tiêu'),
('Hệ thống tưới tự động', 'actuator', NULL, 'Hệ thống tưới nhỏ giọt/phun sương'),
('Đèn cảnh báo RGB', 'actuator', NULL, 'Đèn LED RGB dùng cho cảnh báo/phân loại'),
('Đèn chiếu sáng', 'actuator', NULL, 'Đèn bổ sung ánh sáng cho cây'),
('Quạt làm mát', 'actuator', NULL, 'Quạt giảm nhiệt độ môi trường'),
('Van nước', 'actuator', NULL, 'Van cấp nước tự động');

INSERT INTO device_capabilities (device_type_id, capability_name, description) VALUES
(5, 'power_on_off', 'Bật/tắt máy bơm'),
(6, 'irrigation_control', 'Điều khiển hệ thống tưới'),
(7, 'color_switch', 'Đổi màu đèn RGB'),
(8, 'light_on_off', 'Bật/tắt đèn chiếu sáng'),
(9, 'fan_on_off', 'Bật/tắt quạt'),
(10, 'valve_open_close', 'Mở/đóng van nước');

INSERT INTO devices (device_code, device_name, device_type_id, zone_id, install_location, is_controllable, status, last_updated) VALUES
('DEV-TEMP-01', 'Cảm biến nhiệt độ KV1', 1, 1, 'Cột số 1', FALSE, 'online', NOW()),
('DEV-AIR-01', 'Cảm biến độ ẩm không khí KV1', 2, 1, 'Cột số 2', FALSE, 'online', NOW()),
('DEV-SOIL-01', 'Cảm biến độ ẩm đất KV1', 3, 1, 'Luống số 1', FALSE, 'online', NOW()),
('DEV-LIGHT-01', 'Cảm biến ánh sáng KV1', 4, 1, 'Khu trung tâm', FALSE, 'online', NOW()),
('DEV-PUMP-01', 'Máy bơm KV1', 5, 1, 'Nhà bơm', TRUE, 'online', NOW()),
('DEV-LAMP-01', 'Đèn chiếu sáng KV1', 8, 1, 'Giàn giữa', TRUE, 'online', NOW()),
('DEV-FAN-01', 'Quạt làm mát KV2', 9, 2, 'Nhà lưới KV2', TRUE, 'online', NOW()),
('DEV-VALVE-01', 'Van nước KV2', 10, 2, 'Đầu đường ống KV2', TRUE, 'online', NOW());

INSERT INTO zone_thresholds (zone_id, metric_type, min_value, max_value) VALUES
(1, 'temperature', 18.00, 30.00),
(1, 'air_humidity', 60.00, 80.00),
(1, 'soil_moisture', 50.00, 75.00),
(1, 'light', 10000.00, 40000.00),
(2, 'temperature', 20.00, 35.00),
(2, 'soil_moisture', 40.00, 65.00),
(3, 'temperature', 15.00, 40.00),
(3, 'soil_moisture', 20.00, 40.00);

INSERT INTO watering_modes (zone_id, mode, trigger_threshold_soil_moisture) VALUES
(1, 'auto_sensor', 45.00),
(2, 'scheduled', 35.00),
(3, 'manual', 25.00);

INSERT INTO schedules (zone_id, device_id, execution_mode, schedule_type, start_time, end_time, day_of_week, duration_seconds, is_active, created_by) VALUES
(1, 5, 'automatic', 'daily', '06:00:00', '06:05:00', NULL, 300, TRUE, 2),
(1, 6, 'automatic', 'daily', '18:00:00', '20:00:00', NULL, 7200, TRUE, 2),
(2, 8, 'threshold_based', NULL, NULL, NULL, NULL, 180, TRUE, 2),
(3, 5, 'manual', NULL, NULL, NULL, NULL, 120, TRUE, 2);

INSERT INTO sensor_data (device_id, value, recorded_at, synced) VALUES
(1, 28.50, NOW(), TRUE),
(2, 72.00, NOW(), TRUE),
(3, 43.00, NOW(), TRUE),
(4, 18500.00, NOW(), TRUE),
(1, 29.10, NOW() - INTERVAL '1 hour', TRUE),
(3, 41.50, NOW() - INTERVAL '1 hour', TRUE);

INSERT INTO sensor_daily_statistics (device_id, stat_date, min_value, max_value, avg_value, total_records) VALUES
(1, CURRENT_DATE, 27.80, 29.10, 28.47, 24),
(3, CURRENT_DATE, 41.50, 46.00, 43.80, 24),
(4, CURRENT_DATE, 15000.00, 22000.00, 18400.00, 24);

INSERT INTO alert_rules (rule_name, plant_type_id, zone_id, severity, message_template, is_active, created_by) VALUES
('Cảnh báo héo cây cà chua', 2, 2, 'critical', 'Nguy cơ héo cây cà chua do nhiệt độ cao và độ ẩm đất thấp', TRUE, 2),
('Cảnh báo thiếu ẩm cải xanh', 1, 1, 'warning', 'Cải xanh có nguy cơ thiếu ẩm do độ ẩm đất thấp', TRUE, 2);

INSERT INTO alert_rule_conditions (alert_rule_id, metric_type, operator, value1, value2, logical_group) VALUES
(1, 'temperature', '>', 35.00, NULL, 'AND'),
(1, 'soil_moisture', '<', 30.00, NULL, 'AND'),
(2, 'soil_moisture', '<', 45.00, NULL, 'AND');

INSERT INTO alert_actions (alert_rule_id, action_type, target_device_id, action_params) VALUES
(1, 'notify', NULL, '{"channel": "mobile_push"}'),
(1, 'turn_on_device', 7, '{"duration_seconds": 300}'),
(2, 'notify', NULL, '{"channel": "dashboard"}');

INSERT INTO alerts (zone_id, device_id, alert_rule_id, alert_type, source_type, severity, metric_type, threshold_value, actual_value, message, status) VALUES
(1, 3, 2, 'rule_based', 'threshold_rule', 'warning', 'soil_moisture', 45.00, 43.00, 'Cải xanh có nguy cơ thiếu ẩm do độ ẩm đất thấp', 'detected');

INSERT INTO alert_handling_logs (alert_id, handled_by, action_taken, notes) VALUES
(1, 2, 'Kiểm tra khu vườn và chuẩn bị tưới', 'Đã xác minh cảm biến hoạt động bình thường');

INSERT INTO device_commands (device_id, command_type, parameters, status, issued_by, issued_at) VALUES
(5, 'turn_on', '{"duration_seconds": 120}', 'executed', 2, NOW()),
(6, 'turn_on', '{"mode": "supplement_light", "duration_seconds": 3600}', 'sent', 2, NOW());

INSERT INTO automation_rules (rule_name, zone_id, plant_type_id, is_active, priority, created_by) VALUES
('Tự động bật bơm khi đất khô KV1', 1, 1, TRUE, 1, 2),
('Tự động bật đèn khi thiếu sáng KV1', 1, 1, TRUE, 2, 2),
('Tự động bật quạt khi nhiệt độ cao KV2', 2, 2, TRUE, 1, 2);

INSERT INTO automation_rule_conditions (automation_rule_id, metric_type, operator, value1, value2, logical_group) VALUES
(1, 'soil_moisture', '<', 40.00, NULL, 'AND'),
(2, 'light', '<', 8000.00, NULL, 'AND'),
(3, 'temperature', '>', 36.00, NULL, 'AND');

INSERT INTO automation_rule_actions (automation_rule_id, device_id, command_type, parameters, execution_order) VALUES
(1, 5, 'turn_on', '{"duration_seconds": 180}', 1),
(2, 6, 'turn_on', '{"duration_seconds": 7200}', 1),
(3, 7, 'turn_on', '{"duration_seconds": 300}', 1);

INSERT INTO ai_detection_events (zone_id, detection_type, image_path, result_label, confidence, details, alert_id, detected_by_user) VALUES
(2, 'plant_anomaly', '/images/zone2/tomato_leaf_001.jpg', 'vang_la', 0.9321, '{"note": "Dấu hiệu vàng lá mức độ trung bình"}', NULL, 2),
(1, 'fruit_classification', '/images/zone1/harvest_001.jpg', 'trai_tot', 0.9812, '{"rgb_color": "green"}', NULL, 2);

INSERT INTO notifications (user_id, alert_id, channel, title, body, is_read) VALUES
(2, 1, 'dashboard', 'Cảnh báo thiếu ẩm', 'Khu vườn 1 đang có nguy cơ thiếu ẩm.', FALSE),
(3, 1, 'mobile_push', 'Cảnh báo khu vườn', 'Độ ẩm đất tại khu vườn 1 thấp hơn ngưỡng.', FALSE);

INSERT INTO system_logs (user_id, action_type, entity_type, entity_id, description, value_before, value_after, ip_address) VALUES
(2, 'schedule_change', 'schedules', 1, 'Tạo lịch tưới tự động cho máy bơm KV1', NULL, '{"execution_mode": "automatic", "schedule_type": "daily", "start_time": "06:00:00"}', '192.168.1.10'),
(1, 'rule_change', 'automation_rules', 1, 'Tạo rule tự động bật bơm khi đất khô', NULL, '{"rule_name": "Tự động bật bơm khi đất khô KV1"}', '192.168.1.1');

INSERT INTO data_backups (backup_type, schedule_type, file_path, file_size_bytes, status, created_by, created_at, completed_at, notes) VALUES
('auto', 'daily', '/backups/smart_farm_daily_001.zip', 10485760, 'completed', 1, NOW(), NOW(), 'Sao lưu định kỳ hằng ngày'),
('manual', NULL, '/backups/smart_farm_manual_001.zip', 12582912, 'completed', 1, NOW(), NOW(), 'Sao lưu trước khi nâng cấp hệ thống');

INSERT INTO data_restorations (backup_id, restored_by, status, started_at, completed_at, notes) VALUES
(2, 1, 'completed', NOW(), NOW(), 'Khôi phục môi trường test');

INSERT INTO agricultural_reports (zone_id, report_type, date_from, date_to, content, export_file_path, generated_by) VALUES
(1, 'environment_analysis', '2026-03-01', '2026-03-23', '{"avg_temp": 28.4, "avg_soil_moisture": 44.2, "recommendation": "Tăng tần suất tưới vào buổi sáng"}', '/reports/zone1_env_20260323.pdf', 2),
(2, 'harvest_recommendation', '2026-03-01', '2026-03-23', '{"ripeness_score": 0.82, "recommendation": "Có thể thu hoạch trong 3-5 ngày tới"}', '/reports/zone2_harvest_20260323.pdf', 2);

INSERT INTO gateway_sync_queue (device_id, payload, recorded_at, synced, synced_at) VALUES
(3, '{"value": 39.50, "metric": "soil_moisture"}', NOW() - INTERVAL '10 minutes', FALSE, NULL),
(1, '{"value": 30.20, "metric": "temperature"}', NOW() - INTERVAL '8 minutes', TRUE, NOW());

INSERT INTO user_sessions (user_id, token, expires_at, is_active, ip_address, user_agent) VALUES
(1, 'token_admin_001', NOW() + INTERVAL '1 day', TRUE, '192.168.1.1', 'Mozilla/5.0'),
(2, 'token_farmer_001', NOW() + INTERVAL '1 day', TRUE, '192.168.1.10', 'Mozilla/5.0');

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW vw_zone_current_sensor_values AS
SELECT
    z.zone_id, z.zone_name,
    d.device_id, d.device_name,
    dt.type_name AS device_type,
    sd.value, sd.recorded_at
FROM farm_zones z
JOIN devices d ON z.zone_id = d.zone_id
JOIN device_types dt ON d.device_type_id = dt.device_type_id
JOIN sensor_data sd ON d.device_id = sd.device_id
WHERE dt.category = 'sensor';

CREATE OR REPLACE VIEW vw_active_alerts AS
SELECT
    a.alert_id, a.zone_id, z.zone_name,
    a.alert_type, a.severity, a.message,
    a.status, a.created_at
FROM alerts a
JOIN farm_zones z ON a.zone_id = z.zone_id
WHERE a.status IN ('detected', 'processing');
