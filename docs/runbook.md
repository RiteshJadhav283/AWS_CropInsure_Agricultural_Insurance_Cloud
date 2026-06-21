# Operations Runbook - CropInsure System Administration

This guide provides instructions for managing, maintaining, and troubleshooting the CropInsure Agricultural Insurance Cloud system on Linux hosts.

---

## 1. Access Control & SSH Login
Administrators access the secure EC2 instances inside private subnets via the Bastion Host.

### SSH Command Structure
```bash
# SSH into Bastion Host using administrative keypair
ssh -i "cropinsure-key.pem" ec2-user@bastion-public-ip

# Forward connection internally to Private Subnet App host
ssh -i "cropinsure-key.pem" ec2-user@10.0.3.15
```

---

## 2. Docker Service Management
The application is fully containerized to ensure easy upgrades and isolation.

### Service Commands
- **View Container Status**:
  ```bash
  docker ps -a
  ```
- **View Live Application Logs**:
  ```bash
  docker logs -f cropinsure_app
  ```
- **Stop services**:
  ```bash
  docker-compose down
  ```
- **Start / Restart services**:
  ```bash
  docker-compose up -d
  ```

---

## 3. Database Maintenance & Backups

### Automated Backups (Cron Job)
A cron job runs the `backup.sh` script daily at midnight. To review or edit the schedules:
```bash
# View active user crontabs
crontab -l
```
*Standard scheduling rule configuration:*
```text
0 0 * * * /bin/bash /usr/src/app/scripts/backup.sh >> /var/log/cropinsure/backup_cron.log 2>&1
```

### Manual Backup Upload
```bash
# Execute immediate database dump and S3 sync
bash /usr/src/app/scripts/backup.sh
```

---

## 4. Performance Monitoring & Logs
System resources are monitored by the `monitor.sh` script, which logs performance health entries to `logs/system_health.log`.

### Check Resource Usage
```bash
# Inspect CPU, memory, and disk usage
bash /usr/src/app/scripts/monitor.sh
```

### Review Error Logs
- **Node.js Web App Error Stream**:
  ```bash
  docker logs cropinsure_app | grep -E "Error|Exception"
  ```
- **MySQL Connection / Query Warnings**:
  ```bash
  docker logs cropinsure_mysql 2>&1 | grep -i "warning"
  ```

---

## 5. Troubleshooting & FAQ

### Issue: "Error: Connect ECONNREFUSED"
- **Reason**: Web application cannot establish a connection to the MySQL database.
- **Solution**:
  1. Verify the database container is active: `docker ps | grep mysql`.
  2. Verify database health: `docker exec cropinsure_mysql mysqladmin ping -h localhost -u cropinsure_user -pcropinsure_secure_pass`.
  3. If database container is restarting, inspect database initialization logs: `docker logs cropinsure_mysql`.

### Issue: "Disk space full alarm triggered"
- **Reason**: Database backups or logs have consumed the EBS volume.
- **Solution**:
  1. Check disk capacity: `df -h`.
  2. Clear old Docker cache structures: `docker system prune -af`.
  3. Prune historical S3 mock backups: `rm s3_mock_bucket/cropinsure_backup_*` (leaving only the most recent files).
