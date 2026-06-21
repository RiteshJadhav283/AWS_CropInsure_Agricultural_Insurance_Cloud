CREATE DATABASE IF NOT EXISTS cropinsure_db;
USE cropinsure_db;

-- 1. Users Table (Role-based access control)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'farmer', 'adjuster', 'admin', 'billing'
    fullname VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL
);

-- 2. Policies Table (Farmers' insured crops)
CREATE TABLE IF NOT EXISTS policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_number VARCHAR(30) UNIQUE NOT NULL,
    farmer_name VARCHAR(100) NOT NULL,
    crop_type VARCHAR(50) NOT NULL,
    acreage DECIMAL(10,2) NOT NULL,
    sum_insured DECIMAL(12,2) NOT NULL,
    premium DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' -- 'Active', 'Lapsed', 'Claimed'
);

-- 3. Claims Table (Workflow management)
CREATE TABLE IF NOT EXISTS claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_number VARCHAR(30) UNIQUE NOT NULL,
    policy_id INT,
    crop_type VARCHAR(50) NOT NULL,
    reported_loss_date DATE NOT NULL,
    estimated_damage_pct DECIMAL(5,2) NOT NULL,
    claim_amount DECIMAL(12,2) NOT NULL,
    ndvi_health_index DECIMAL(3,2) NOT NULL, -- Simulated satellite health check index
    status VARCHAR(30) DEFAULT 'Pending Review', -- 'Pending Review', 'Field Inspection', 'Approved', 'Disbursed', 'Rejected'
    remarks TEXT,
    FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- 4. Infrastructure Metrics Table (Monitoring & Resource management)
CREATE TABLE IF NOT EXISTS metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cpu_utilization DECIMAL(5,2) NOT NULL,
    memory_utilization DECIMAL(5,2) NOT NULL,
    disk_utilization DECIMAL(5,2) NOT NULL,
    active_connections INT NOT NULL
);

-- 5. Audit logs for security compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL
);

-- Seed Data
INSERT INTO users (username, password_hash, role, fullname, region) VALUES
('farmer_rajesh', 'pass123', 'farmer', 'Rajesh Patel', 'Midwest-US'),
('adjuster_sunita', 'pass123', 'adjuster', 'Sunita Sharma', 'Midwest-US'),
('admin_amit', 'pass123', 'admin', 'Amit Verma', 'All-Regions'),
('billing_priya', 'pass123', 'billing', 'Priya Iyer', 'Corporate');

INSERT INTO policies (policy_number, farmer_name, crop_type, acreage, sum_insured, premium, start_date, end_date, status) VALUES
('POL-2026-001', 'Rajesh Patel', 'Corn', 120.00, 150000.00, 7500.00, '2026-04-01', '2026-10-01', 'Active'),
('POL-2026-002', 'Ananya Sen', 'Soybeans', 85.00, 110000.00, 5500.00, '2026-04-15', '2026-10-15', 'Active'),
('POL-2026-003', 'Karan Gupta', 'Wheat', 250.00, 320000.00, 16000.00, '2026-03-01', '2026-09-01', 'Active'),
('POL-2026-004', 'Kiran Thakur', 'Rice', 50.00, 95000.00, 4800.00, '2026-05-01', '2026-11-01', 'Active');

INSERT INTO claims (claim_number, policy_id, crop_type, reported_loss_date, estimated_damage_pct, claim_amount, ndvi_health_index, status, remarks) VALUES
('CLM-2026-501', 1, 'Corn', '2026-06-10', 45.00, 67500.00, 0.32, 'Pending Review', 'Severe drought conditions recorded in June.'),
('CLM-2026-502', 3, 'Wheat', '2026-05-22', 15.00, 48000.00, 0.58, 'Approved', 'Hail damage assessed by regional agent.');

INSERT INTO metrics (cpu_utilization, memory_utilization, disk_utilization, active_connections) VALUES
(22.4, 45.1, 18.2, 5),
(25.8, 44.9, 18.2, 8);

INSERT INTO audit_logs (user_role, action, ip_address) VALUES
('admin', 'Database schema initialized', '127.0.0.1');
