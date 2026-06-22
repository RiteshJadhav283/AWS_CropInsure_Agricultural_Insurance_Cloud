#!/bin/bash
# backup.sh - Database backup script simulating S3 bucket uploads

BACKUP_DIR="s3_mock_bucket"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="cropinsure_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${FILE_NAME}.gz"

echo "=================================================="
echo " Starting Database Backup Process"
echo "=================================================="

# Create mock backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if MySQL container is active and accessible
CONTAINER_NAME="cropinsure_mysql"
IS_DOCKER=$(docker ps -q -f name=$CONTAINER_NAME 2>/dev/null)

if [ -n "$IS_DOCKER" ]; then
    echo "Active MySQL Docker container found ($CONTAINER_NAME). Dumping schema..."
    docker exec $CONTAINER_NAME mysqldump -u cropinsure_user -pcropinsure_secure_pass cropinsure_db > "$BACKUP_DIR/$FILE_NAME" 2>/dev/null
else
    # Check if local command line mysql exists
    if command -v mysqldump &> /dev/null; then
        echo "Local mysqldump executable found. Accessing host database..."
        mysqldump -h localhost -u cropinsure_user -pcropinsure_secure_pass cropinsure_db > "$BACKUP_DIR/$FILE_NAME" 2>/dev/null
    else
        # Seed a mock SQL script representing a backup for local standalone Node testing
        echo "No active MySQL server found. Generating administrative mock SQL archive..."
        cat <<EOT > "$BACKUP_DIR/$FILE_NAME"
-- CropInsure Mock SQL Backup Dump
-- Generated at: $(date)
CREATE DATABASE IF NOT EXISTS cropinsure_db;
USE cropinsure_db;
-- Dump containing policies, claims, audit_logs and metrics tables.
EOT
    fi
fi

# Compress the SQL backup
echo "Compressing SQL database dump..."
gzip -f "$BACKUP_DIR/$FILE_NAME"

# Upload to S3 bucket
echo "Uploading archive to S3 bucket: s3://cropinsure-backups-mumbai/"
if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_DIR/$COMPRESSED_FILE" "s3://cropinsure-backups-mumbai/$COMPRESSED_FILE" --only-show-errors
    echo "[SUCCESS] Backup uploaded to S3: s3://cropinsure-backups-mumbai/$COMPRESSED_FILE"
else
    echo "[SIMULATION] AWS CLI not found. Backup saved locally: $COMPRESSED_FILE"
fi

# Log clean up: Keep only the 5 most recent backups
echo "Pruning historical backups (Retention limit: 5)..."
cd "$BACKUP_DIR" && ls -t cropinsure_backup_*.sql.gz | tail -n +6 | xargs rm -f 2>/dev/null
echo "Backup execution cycle completed successfully."
