-- ============================================================
-- DATABASE: Smart Farm Device Management System (Revised)
-- Hệ thống quản lý thiết bị nông trại thông minh - phiên bản mở rộng
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_farm;
USE railway;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sensor_daily_statistics;
DROP TABLE IF EXISTS alert_handling_logs;
DROP TABLE IF EXISTS automation_rule_actions;
DROP TABLE IF EXISTS automation_rule_conditions;
DROP TABLE IF EXISTS automation_rules;
DROP TABLE IF EXISTS alert_actions;
DROP TABLE IF EXISTS alert_rule_conditions;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS gateway_sync_queue;
DROP TABLE IF EXISTS agricultural_reports;
DROP TABLE IF EXISTS data_restorations;
DROP TABLE IF EXISTS data_backups;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS ai_detection_events;
DROP TABLE IF EXISTS watering_modes;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS device_commands;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS zone_thresholds;
DROP TABLE IF EXISTS sensor_data_archive;
DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS device_capabilities;
DROP TABLE IF EXISTS device_types;
DROP TABLE IF EXISTS user_zone_access;
DROP TABLE IF EXISTS farm_user_access;
DROP TABLE IF EXISTS farm_zones;
DROP TABLE IF EXISTS farms;
DROP TABLE IF EXISTS plant_types;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    role_id         INT AUTO_INCREMENT PRIMARY KEY,
    role_name       VARCHAR(30) NOT NULL UNIQUE,
    description     VARCHAR(255)
);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    user_id          INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    email            VARCHAR(100) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(100),
    phone            VARCHAR(20),
    role_id          INT NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ============================================================
-- 3. USER_SESSIONS
-- ============================================================
CREATE TABLE user_sessions (
    session_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    token            VARCHAR(512) NOT NULL UNIQUE,
    login_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at       DATETIME NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address       VARCHAR(45),
    user_agent       VARCHAR(512),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- 4. FARMS
-- ============================================================
CREATE TABLE farms (
    farm_id          INT AUTO_INCREMENT PRIMARY KEY,
    farm_code        VARCHAR(50) NOT NULL UNIQUE,
    farm_name        VARCHAR(100) NOT NULL,
    owner_name       VARCHAR(100),
    location_desc    VARCHAR(255),
    area_m2          DECIMAL(12,2),
    status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. FARM_USER_ACCESS
-- ============================================================
CREATE TABLE farm_user_access (
    user_id          INT NOT NULL,
    farm_id          INT NOT NULL,
    granted_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by       INT,
    PRIMARY KEY (user_id, farm_id),
    CONSTRAINT fk_fua_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_fua_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    CONSTRAINT fk_fua_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id)
);

-- ============================================================
-- 6. PLANT_TYPES
-- ============================================================
CREATE TABLE plant_types (
    plant_type_id                      INT AUTO_INCREMENT PRIMARY KEY,
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
    created_at                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. FARM_ZONES
-- ============================================================
CREATE TABLE farm_zones (
    zone_id            INT AUTO_INCREMENT PRIMARY KEY,
    farm_id            INT NOT NULL,
    zone_name          VARCHAR(100) NOT NULL,
    plant_type_id      INT,
    area_m2            DECIMAL(10,2),
    location_desc      VARCHAR(255),
    status             ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_zones_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    CONSTRAINT fk_zones_plant FOREIGN KEY (plant_type_id) REFERENCES plant_types(plant_type_id)
);

-- ============================================================
-- 8. USER_ZONE_ACCESS
-- ============================================================
CREATE TABLE user_zone_access (
    user_id           INT NOT NULL,
    zone_id           INT NOT NULL,
    granted_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by        INT,
    PRIMARY KEY (user_id, zone_id),
    CONSTRAINT fk_uza_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_uza_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_uza_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id)
);

-- ============================================================
-- 9. DEVICE_TYPES
-- ============================================================
CREATE TABLE device_types (
    device_type_id    INT AUTO_INCREMENT PRIMARY KEY,
    type_name         VARCHAR(50) NOT NULL UNIQUE,
    category          ENUM('sensor','actuator') NOT NULL,
    unit              VARCHAR(20),
    description       VARCHAR(255)
);

-- ============================================================
-- 10. DEVICE_CAPABILITIES
-- ============================================================
CREATE TABLE device_capabilities (
    capability_id     INT AUTO_INCREMENT PRIMARY KEY,
    device_type_id    INT NOT NULL,
    capability_name   VARCHAR(100) NOT NULL,
    description       VARCHAR(255),
    CONSTRAINT fk_dcap_type FOREIGN KEY (device_type_id) REFERENCES device_types(device_type_id)
);

-- ============================================================
-- 11. DEVICES
-- ============================================================
CREATE TABLE devices (
    device_id          INT AUTO_INCREMENT PRIMARY KEY,
    device_code        VARCHAR(50) NOT NULL UNIQUE,
    device_name        VARCHAR(100) NOT NULL,
    device_type_id     INT NOT NULL,
    zone_id            INT NOT NULL,
    install_location   VARCHAR(255),
    is_controllable    BOOLEAN NOT NULL DEFAULT FALSE,
    status             ENUM('online','offline','error','active') NOT NULL DEFAULT 'offline',
    last_updated       DATETIME,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_devices_type FOREIGN KEY (device_type_id) REFERENCES device_types(device_type_id),
    CONSTRAINT fk_devices_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id)
);

-- ============================================================
-- 12. SENSOR_DATA
-- ============================================================
CREATE TABLE sensor_data (
    sensor_data_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id          INT NOT NULL,
    value              DECIMAL(10,2) NOT NULL,
    recorded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synced             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_sdata_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    INDEX idx_sensor_device_time (device_id, recorded_at)
);

-- ============================================================
-- 13. SENSOR_DATA_ARCHIVE
-- ============================================================
CREATE TABLE sensor_data_archive (
    sensor_data_id     BIGINT PRIMARY KEY,
    device_id          INT NOT NULL,
    value              DECIMAL(10,2) NOT NULL,
    recorded_at        DATETIME NOT NULL,
    synced             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_sdata_arch_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    INDEX idx_archive_device_time (device_id, recorded_at)
);

-- ============================================================
-- 14. SENSOR_DAILY_STATISTICS
-- ============================================================
CREATE TABLE sensor_daily_statistics (
    stat_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id          INT NOT NULL,
    stat_date          DATE NOT NULL,
    min_value          DECIMAL(10,2),
    max_value          DECIMAL(10,2),
    avg_value          DECIMAL(10,2),
    total_records      INT NOT NULL DEFAULT 0,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_device_stat_date (device_id, stat_date),
    CONSTRAINT fk_sds_device FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- ============================================================
-- 15. ZONE_THRESHOLDS
-- ============================================================
CREATE TABLE zone_thresholds (
    threshold_id       INT AUTO_INCREMENT PRIMARY KEY,
    zone_id            INT NOT NULL,
    metric_type        ENUM('temperature','air_humidity','soil_moisture','light') NOT NULL,
    min_value          DECIMAL(10,2),
    max_value          DECIMAL(10,2),
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_zone_metric (zone_id, metric_type),
    CONSTRAINT fk_threshold_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id)
);

-- ============================================================
-- 16. ALERT_RULES
-- ============================================================
CREATE TABLE alert_rules (
    alert_rule_id      INT AUTO_INCREMENT PRIMARY KEY,
    rule_name          VARCHAR(100) NOT NULL,
    plant_type_id      INT,
    zone_id            INT,
    severity           ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
    message_template   VARCHAR(255) NOT NULL,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by         INT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_arule_plant FOREIGN KEY (plant_type_id) REFERENCES plant_types(plant_type_id),
    CONSTRAINT fk_arule_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_arule_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- ============================================================
-- 17. ALERT_RULE_CONDITIONS
-- ============================================================
CREATE TABLE alert_rule_conditions (
    condition_id       INT AUTO_INCREMENT PRIMARY KEY,
    alert_rule_id      INT NOT NULL,
    metric_type        ENUM('temperature','air_humidity','soil_moisture','light') NOT NULL,
    operator           ENUM('>','>=','<','<=','=','between') NOT NULL,
    value1             DECIMAL(10,2) NOT NULL,
    value2             DECIMAL(10,2),
    logical_group      VARCHAR(20) NOT NULL DEFAULT 'AND',
    CONSTRAINT fk_arule_cond FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(alert_rule_id)
);

-- ============================================================
-- 18. ALERT_ACTIONS
-- ============================================================
CREATE TABLE alert_actions (
    alert_action_id    INT AUTO_INCREMENT PRIMARY KEY,
    alert_rule_id      INT NOT NULL,
    action_type        ENUM('notify','turn_on_device','turn_off_device','create_ticket') NOT NULL,
    target_device_id   INT,
    action_params      JSON,
    CONSTRAINT fk_aaction_rule FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(alert_rule_id),
    CONSTRAINT fk_aaction_device FOREIGN KEY (target_device_id) REFERENCES devices(device_id)
);

-- ============================================================
-- 19. ALERTS
-- ============================================================
CREATE TABLE alerts (
    alert_id           INT AUTO_INCREMENT PRIMARY KEY,
    zone_id            INT NOT NULL,
    device_id          INT,
    alert_rule_id      INT,
    alert_type         ENUM('threshold_exceeded','plant_anomaly','fruit_classification','system','rule_based') NOT NULL,
    source_type        ENUM('threshold_rule','ai_detection','system','manual') NOT NULL DEFAULT 'threshold_rule',
    severity           ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
    metric_type        ENUM('temperature','air_humidity','soil_moisture','light') NULL,
    threshold_value    DECIMAL(10,2),
    actual_value       DECIMAL(10,2),
    message            TEXT NOT NULL,
    status             ENUM('detected','processing','resolved') NOT NULL DEFAULT 'detected',
    acknowledged_by    INT,
    resolved_by        INT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at    DATETIME,
    resolved_at        DATETIME,
    CONSTRAINT fk_alerts_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_alerts_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    CONSTRAINT fk_alerts_rule FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(alert_rule_id),
    CONSTRAINT fk_alerts_ack_user FOREIGN KEY (acknowledged_by) REFERENCES users(user_id),
    CONSTRAINT fk_alerts_res_user FOREIGN KEY (resolved_by) REFERENCES users(user_id)
);

-- ============================================================
-- 20. ALERT_HANDLING_LOGS
-- ============================================================
CREATE TABLE alert_handling_logs (
    handling_log_id    INT AUTO_INCREMENT PRIMARY KEY,
    alert_id           INT NOT NULL,
    handled_by         INT NOT NULL,
    action_taken       VARCHAR(255) NOT NULL,
    notes              TEXT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ahl_alert FOREIGN KEY (alert_id) REFERENCES alerts(alert_id),
    CONSTRAINT fk_ahl_user FOREIGN KEY (handled_by) REFERENCES users(user_id)
);

-- ============================================================
-- 21. DEVICE_COMMANDS
-- ============================================================
CREATE TABLE device_commands (
    command_id         INT AUTO_INCREMENT PRIMARY KEY,
    device_id          INT NOT NULL,
    command_type       VARCHAR(50) NOT NULL,
    parameters         JSON,
    status             ENUM('pending','sent','executed','failed') NOT NULL DEFAULT 'pending',
    issued_by          INT,
    issued_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_at        DATETIME,
    CONSTRAINT fk_cmd_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    CONSTRAINT fk_cmd_user FOREIGN KEY (issued_by) REFERENCES users(user_id)
);

-- ============================================================
-- 22. SCHEDULES
-- ============================================================
CREATE TABLE schedules (
    schedule_id        INT AUTO_INCREMENT PRIMARY KEY,
    zone_id            INT NOT NULL,
    device_id          INT NOT NULL,
    execution_mode     ENUM('manual','automatic','threshold_based') NOT NULL DEFAULT 'automatic',
    schedule_type      ENUM('hourly','daily','weekly') NULL,
    start_time         TIME,
    end_time           TIME,
    day_of_week        TINYINT NULL COMMENT '0=Sun,1=Mon,...,6=Sat',
    duration_seconds   INT,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by         INT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_sched_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    CONSTRAINT fk_sched_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- ============================================================
-- 23. WATERING_MODES
-- ============================================================
CREATE TABLE watering_modes (
    watering_mode_id                   INT AUTO_INCREMENT PRIMARY KEY,
    zone_id                            INT NOT NULL UNIQUE,
    mode                               ENUM('auto_sensor','scheduled','manual') NOT NULL DEFAULT 'auto_sensor',
    trigger_threshold_soil_moisture    DECIMAL(5,2),
    updated_at                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wmode_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id)
);

-- ============================================================
-- 24. AUTOMATION_RULES
-- ============================================================
CREATE TABLE automation_rules (
    automation_rule_id  INT AUTO_INCREMENT PRIMARY KEY,
    rule_name           VARCHAR(100) NOT NULL,
    zone_id             INT NOT NULL,
    plant_type_id       INT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INT NOT NULL DEFAULT 1,
    created_by          INT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_autorule_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_autorule_plant FOREIGN KEY (plant_type_id) REFERENCES plant_types(plant_type_id),
    CONSTRAINT fk_autorule_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- ============================================================
-- 25. AUTOMATION_RULE_CONDITIONS
-- ============================================================
CREATE TABLE automation_rule_conditions (
    condition_id         INT AUTO_INCREMENT PRIMARY KEY,
    automation_rule_id   INT NOT NULL,
    metric_type          ENUM('temperature','air_humidity','soil_moisture','light') NOT NULL,
    operator             ENUM('>','>=','<','<=','=','between') NOT NULL,
    value1               DECIMAL(10,2) NOT NULL,
    value2               DECIMAL(10,2),
    logical_group        VARCHAR(20) NOT NULL DEFAULT 'AND',
    CONSTRAINT fk_autocond_rule FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(automation_rule_id)
);

-- ============================================================
-- 26. AUTOMATION_RULE_ACTIONS
-- ============================================================
CREATE TABLE automation_rule_actions (
    action_id            INT AUTO_INCREMENT PRIMARY KEY,
    automation_rule_id   INT NOT NULL,
    device_id            INT NOT NULL,
    command_type         VARCHAR(50) NOT NULL,
    parameters           JSON,
    execution_order      INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_autoact_rule FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(automation_rule_id),
    CONSTRAINT fk_autoact_device FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- ============================================================
-- 27. AI_DETECTION_EVENTS
-- ============================================================
CREATE TABLE ai_detection_events (
    event_id             INT AUTO_INCREMENT PRIMARY KEY,
    zone_id              INT NOT NULL,
    detection_type       ENUM('plant_anomaly','fruit_classification') NOT NULL,
    image_path           VARCHAR(500) NOT NULL,
    result_label         VARCHAR(100) NOT NULL,
    confidence           DECIMAL(5,4),
    details              JSON,
    alert_id             INT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detected_by_user     INT,
    CONSTRAINT fk_ai_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_ai_alert FOREIGN KEY (alert_id) REFERENCES alerts(alert_id),
    CONSTRAINT fk_ai_user FOREIGN KEY (detected_by_user) REFERENCES users(user_id)
);

-- ============================================================
-- 28. SYSTEM_LOGS
-- ============================================================
CREATE TABLE system_logs (
    log_id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT,
    action_type          ENUM('device_toggle','config_change','alert','user_access','schedule_change','system_event','rule_change','backup_restore') NOT NULL,
    entity_type          VARCHAR(50) NOT NULL,
    entity_id            INT,
    description          TEXT NOT NULL,
    value_before         JSON,
    value_after          JSON,
    ip_address           VARCHAR(45),
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_logs_action_time (action_type, created_at),
    INDEX idx_logs_entity (entity_type, entity_id)
);

-- ============================================================
-- 29. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    notification_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT NOT NULL,
    alert_id             INT,
    channel              ENUM('dashboard','web_push','mobile_push') NOT NULL,
    title                VARCHAR(200) NOT NULL,
    body                 TEXT NOT NULL,
    is_read              BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at              DATETIME,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_notif_alert FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
);

-- ============================================================
-- 30. DATA_BACKUPS
-- ============================================================
CREATE TABLE data_backups (
    backup_id            INT AUTO_INCREMENT PRIMARY KEY,
    backup_type          ENUM('auto','manual') NOT NULL,
    schedule_type        ENUM('daily','weekly') NULL,
    file_path            VARCHAR(500) NOT NULL,
    file_size_bytes      BIGINT,
    status               ENUM('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
    created_by           INT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at         DATETIME,
    notes                TEXT,
    CONSTRAINT fk_backup_user FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- ============================================================
-- 31. DATA_RESTORATIONS
-- ============================================================
CREATE TABLE data_restorations (
    restore_id           INT AUTO_INCREMENT PRIMARY KEY,
    backup_id            INT NOT NULL,
    restored_by          INT NOT NULL,
    status               ENUM('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
    started_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at         DATETIME,
    notes                TEXT,
    CONSTRAINT fk_restore_backup FOREIGN KEY (backup_id) REFERENCES data_backups(backup_id),
    CONSTRAINT fk_restore_user FOREIGN KEY (restored_by) REFERENCES users(user_id)
);

-- ============================================================
-- 32. AGRICULTURAL_REPORTS
-- ============================================================
CREATE TABLE agricultural_reports (
    report_id            INT AUTO_INCREMENT PRIMARY KEY,
    zone_id              INT NOT NULL,
    report_type          ENUM('growth_analysis','environment_analysis','harvest_recommendation','seasonal_summary') NOT NULL,
    date_from            DATE NOT NULL,
    date_to              DATE NOT NULL,
    content              JSON NOT NULL,
    export_file_path     VARCHAR(500),
    generated_by         INT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_zone FOREIGN KEY (zone_id) REFERENCES farm_zones(zone_id),
    CONSTRAINT fk_report_user FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

-- ============================================================
-- 33. GATEWAY_SYNC_QUEUE
-- ============================================================
CREATE TABLE gateway_sync_queue (
    sync_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id            INT NOT NULL,
    payload              JSON NOT NULL,
    recorded_at          DATETIME NOT NULL,
    synced               BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at            DATETIME,
    CONSTRAINT fk_sync_device FOREIGN KEY (device_id) REFERENCES devices(device_id),
    INDEX idx_sync_pending (synced, recorded_at)
);

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
(1, 29.10, DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE),
(3, 41.50, DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE);

INSERT INTO sensor_daily_statistics (device_id, stat_date, min_value, max_value, avg_value, total_records) VALUES
(1, CURDATE(), 27.80, 29.10, 28.47, 24),
(3, CURDATE(), 41.50, 46.00, 43.80, 24),
(4, CURDATE(), 15000.00, 22000.00, 18400.00, 24);

INSERT INTO alert_rules (rule_name, plant_type_id, zone_id, severity, message_template, is_active, created_by) VALUES
('Cảnh báo héo cây cà chua', 2, 2, 'critical', 'Nguy cơ héo cây cà chua do nhiệt độ cao và độ ẩm đất thấp', TRUE, 2),
('Cảnh báo thiếu ẩm cải xanh', 1, 1, 'warning', 'Cải xanh có nguy cơ thiếu ẩm do độ ẩm đất thấp', TRUE, 2);

INSERT INTO alert_rule_conditions (alert_rule_id, metric_type, operator, value1, value2, logical_group) VALUES
(1, 'temperature', '>', 35.00, NULL, 'AND'),
(1, 'soil_moisture', '<', 30.00, NULL, 'AND'),
(2, 'soil_moisture', '<', 45.00, NULL, 'AND');

INSERT INTO alert_actions (alert_rule_id, action_type, target_device_id, action_params) VALUES
(1, 'notify', NULL, JSON_OBJECT('channel', 'mobile_push')),
(1, 'turn_on_device', 7, JSON_OBJECT('duration_seconds', 300)),
(2, 'notify', NULL, JSON_OBJECT('channel', 'dashboard'));

INSERT INTO alerts (zone_id, device_id, alert_rule_id, alert_type, source_type, severity, metric_type, threshold_value, actual_value, message, status) VALUES
(1, 3, 2, 'rule_based', 'threshold_rule', 'warning', 'soil_moisture', 45.00, 43.00, 'Cải xanh có nguy cơ thiếu ẩm do độ ẩm đất thấp', 'detected');

INSERT INTO alert_handling_logs (alert_id, handled_by, action_taken, notes) VALUES
(1, 2, 'Kiểm tra khu vườn và chuẩn bị tưới', 'Đã xác minh cảm biến hoạt động bình thường');

INSERT INTO device_commands (device_id, command_type, parameters, status, issued_by, issued_at) VALUES
(5, 'turn_on', JSON_OBJECT('duration_seconds', 120), 'executed', 2, NOW()),
(6, 'turn_on', JSON_OBJECT('mode', 'supplement_light', 'duration_seconds', 3600), 'sent', 2, NOW());

INSERT INTO automation_rules (rule_name, zone_id, plant_type_id, is_active, priority, created_by) VALUES
('Tự động bật bơm khi đất khô KV1', 1, 1, TRUE, 1, 2),
('Tự động bật đèn khi thiếu sáng KV1', 1, 1, TRUE, 2, 2),
('Tự động bật quạt khi nhiệt độ cao KV2', 2, 2, TRUE, 1, 2);

INSERT INTO automation_rule_conditions (automation_rule_id, metric_type, operator, value1, value2, logical_group) VALUES
(1, 'soil_moisture', '<', 40.00, NULL, 'AND'),
(2, 'light', '<', 8000.00, NULL, 'AND'),
(3, 'temperature', '>', 36.00, NULL, 'AND');

INSERT INTO automation_rule_actions (automation_rule_id, device_id, command_type, parameters, execution_order) VALUES
(1, 5, 'turn_on', JSON_OBJECT('duration_seconds', 180), 1),
(2, 6, 'turn_on', JSON_OBJECT('duration_seconds', 7200), 1),
(3, 7, 'turn_on', JSON_OBJECT('duration_seconds', 300), 1);

INSERT INTO ai_detection_events (zone_id, detection_type, image_path, result_label, confidence, details, alert_id, detected_by_user) VALUES
(2, 'plant_anomaly', '/images/zone2/tomato_leaf_001.jpg', 'vang_la', 0.9321, JSON_OBJECT('note', 'Dấu hiệu vàng lá mức độ trung bình'), NULL, 2),
(1, 'fruit_classification', '/images/zone1/harvest_001.jpg', 'trai_tot', 0.9812, JSON_OBJECT('rgb_color', 'green'), NULL, 2);

INSERT INTO notifications (user_id, alert_id, channel, title, body, is_read) VALUES
(2, 1, 'dashboard', 'Cảnh báo thiếu ẩm', 'Khu vườn 1 đang có nguy cơ thiếu ẩm.', FALSE),
(3, 1, 'mobile_push', 'Cảnh báo khu vườn', 'Độ ẩm đất tại khu vườn 1 thấp hơn ngưỡng.', FALSE);

INSERT INTO system_logs (user_id, action_type, entity_type, entity_id, description, value_before, value_after, ip_address) VALUES
(2, 'schedule_change', 'schedules', 1, 'Tạo lịch tưới tự động cho máy bơm KV1', NULL, JSON_OBJECT('execution_mode', 'automatic', 'schedule_type', 'daily', 'start_time', '06:00:00'), '192.168.1.10'),
(1, 'rule_change', 'automation_rules', 1, 'Tạo rule tự động bật bơm khi đất khô', NULL, JSON_OBJECT('rule_name', 'Tự động bật bơm khi đất khô KV1'), '192.168.1.1');

INSERT INTO data_backups (backup_type, schedule_type, file_path, file_size_bytes, status, created_by, created_at, completed_at, notes) VALUES
('auto', 'daily', '/backups/smart_farm_daily_001.zip', 10485760, 'completed', 1, NOW(), NOW(), 'Sao lưu định kỳ hằng ngày'),
('manual', NULL, '/backups/smart_farm_manual_001.zip', 12582912, 'completed', 1, NOW(), NOW(), 'Sao lưu trước khi nâng cấp hệ thống');

INSERT INTO data_restorations (backup_id, restored_by, status, started_at, completed_at, notes) VALUES
(2, 1, 'completed', NOW(), NOW(), 'Khôi phục môi trường test');

INSERT INTO agricultural_reports (zone_id, report_type, date_from, date_to, content, export_file_path, generated_by) VALUES
(1, 'environment_analysis', '2026-03-01', '2026-03-23', JSON_OBJECT('avg_temp', 28.4, 'avg_soil_moisture', 44.2, 'recommendation', 'Tăng tần suất tưới vào buổi sáng'), '/reports/zone1_env_20260323.pdf', 2),
(2, 'harvest_recommendation', '2026-03-01', '2026-03-23', JSON_OBJECT('ripeness_score', 0.82, 'recommendation', 'Có thể thu hoạch trong 3-5 ngày tới'), '/reports/zone2_harvest_20260323.pdf', 2);

INSERT INTO gateway_sync_queue (device_id, payload, recorded_at, synced, synced_at) VALUES
(3, JSON_OBJECT('value', 39.50, 'metric', 'soil_moisture'), DATE_SUB(NOW(), INTERVAL 10 MINUTE), FALSE, NULL),
(1, JSON_OBJECT('value', 30.20, 'metric', 'temperature'), DATE_SUB(NOW(), INTERVAL 8 MINUTE), TRUE, NOW());

INSERT INTO user_sessions (user_id, token, expires_at, is_active, ip_address, user_agent) VALUES
(1, 'token_admin_001', DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE, '192.168.1.1', 'Mozilla/5.0'),
(2, 'token_farmer_001', DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE, '192.168.1.10', 'Mozilla/5.0');

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
