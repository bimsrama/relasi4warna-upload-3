#!/bin/bash
# ===========================================
# MongoDB Backup Script for Relasi4Warna
# ===========================================
# Usage:
#   ./backup_mongodb.sh              # Backup to default location
#   ./backup_mongodb.sh /custom/path # Backup to custom location
#   ./backup_mongodb.sh --restore /path/to/backup  # Restore from backup
#
# Cron example (daily at 2 AM):
#   0 2 * * * /app/scripts/backup_mongodb.sh >> /var/log/mongodb_backup.log 2>&1
# ===========================================

set -e

# Configuration
BACKUP_DIR="${1:-/app/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="relasi4warna_backup_${TIMESTAMP}"

# Load environment variables
if [ -f /app/.env ]; then
    export $(grep -v '^#' /app/.env | xargs)
elif [ -f /app/apps/api/.env ]; then
    export $(grep -v '^#' /app/apps/api/.env | xargs)
fi

# Default MongoDB URL if not set
MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
DB_NAME="${DB_NAME:-relasi4warna}"

# Parse MongoDB URL for connection details
# Handles both local and Atlas URLs
if [[ "$MONGO_URL" == *"mongodb+srv"* ]]; then
    # MongoDB Atlas
    MONGO_HOST=$(echo "$MONGO_URL" | sed 's/mongodb+srv:\/\///' | cut -d'/' -f1 | cut -d'@' -f2)
    MONGO_AUTH=$(echo "$MONGO_URL" | sed 's/mongodb+srv:\/\///' | cut -d'@' -f1)
    MONGO_USER=$(echo "$MONGO_AUTH" | cut -d':' -f1)
    MONGO_PASS=$(echo "$MONGO_AUTH" | cut -d':' -f2)
    IS_ATLAS=true
else
    # Local MongoDB
    MONGO_HOST=$(echo "$MONGO_URL" | sed 's/mongodb:\/\///' | cut -d'/' -f1)
    IS_ATLAS=false
fi

# Function to create backup
create_backup() {
    echo "=============================================="
    echo "MongoDB Backup - $(date)"
    echo "=============================================="
    echo "Database: $DB_NAME"
    echo "Backup location: $BACKUP_DIR/$BACKUP_NAME"
    echo ""
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    # Check if running in Docker
    if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        # Running inside Docker - use docker exec
        echo "Detected Docker environment..."
        
        if docker ps --format '{{.Names}}' | grep -q mongo; then
            CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep mongo | head -1)
            echo "Using container: $CONTAINER_NAME"
            
            docker exec "$CONTAINER_NAME" mongodump \
                --db "$DB_NAME" \
                --out "/tmp/backup_${TIMESTAMP}"
            
            docker cp "$CONTAINER_NAME:/tmp/backup_${TIMESTAMP}/$DB_NAME" "$BACKUP_DIR/$BACKUP_NAME/"
            docker exec "$CONTAINER_NAME" rm -rf "/tmp/backup_${TIMESTAMP}"
        else
            echo "No MongoDB container found, using mongodump directly..."
            mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out="$BACKUP_DIR/$BACKUP_NAME"
        fi
    else
        # Running on host
        if [ "$IS_ATLAS" = true ]; then
            echo "Backing up from MongoDB Atlas..."
            mongodump --uri="$MONGO_URL" --out="$BACKUP_DIR/$BACKUP_NAME"
        else
            echo "Backing up from local MongoDB..."
            mongodump --host="$MONGO_HOST" --db="$DB_NAME" --out="$BACKUP_DIR/$BACKUP_NAME"
        fi
    fi
    
    # Compress backup
    echo ""
    echo "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    # Calculate size
    BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    echo "Backup created: ${BACKUP_NAME}.tar.gz ($BACKUP_SIZE)"
    
    # Cleanup old backups
    echo ""
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "relasi4warna_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # List remaining backups
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/relasi4warna_backup_*.tar.gz 2>/dev/null || echo "  No backups found"
    
    echo ""
    echo "=============================================="
    echo "Backup completed successfully!"
    echo "=============================================="
}

# Function to restore backup
restore_backup() {
    RESTORE_PATH="$1"
    
    if [ ! -f "$RESTORE_PATH" ]; then
        echo "Error: Backup file not found: $RESTORE_PATH"
        exit 1
    fi
    
    echo "=============================================="
    echo "MongoDB Restore - $(date)"
    echo "=============================================="
    echo "Restoring from: $RESTORE_PATH"
    echo ""
    
    # Confirm restore
    read -p "This will OVERWRITE the current database. Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi
    
    # Extract backup
    TEMP_DIR=$(mktemp -d)
    echo "Extracting backup..."
    tar -xzf "$RESTORE_PATH" -C "$TEMP_DIR"
    
    # Find the database directory
    DB_DIR=$(find "$TEMP_DIR" -type d -name "$DB_NAME" | head -1)
    if [ -z "$DB_DIR" ]; then
        DB_DIR=$(find "$TEMP_DIR" -mindepth 2 -maxdepth 2 -type d | head -1)
    fi
    
    if [ -z "$DB_DIR" ]; then
        echo "Error: Could not find database directory in backup"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    echo "Found database at: $DB_DIR"
    
    # Restore
    if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        if docker ps --format '{{.Names}}' | grep -q mongo; then
            CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep mongo | head -1)
            docker cp "$DB_DIR" "$CONTAINER_NAME:/tmp/restore_db"
            docker exec "$CONTAINER_NAME" mongorestore \
                --db "$DB_NAME" \
                --drop \
                "/tmp/restore_db"
            docker exec "$CONTAINER_NAME" rm -rf "/tmp/restore_db"
        else
            mongorestore --uri="$MONGO_URL" --db="$DB_NAME" --drop "$DB_DIR"
        fi
    else
        if [ "$IS_ATLAS" = true ]; then
            mongorestore --uri="$MONGO_URL" --drop "$DB_DIR"
        else
            mongorestore --host="$MONGO_HOST" --db="$DB_NAME" --drop "$DB_DIR"
        fi
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    echo ""
    echo "=============================================="
    echo "Restore completed successfully!"
    echo "=============================================="
}

# Function to list backups
list_backups() {
    echo "=============================================="
    echo "Available Backups"
    echo "=============================================="
    echo "Location: $BACKUP_DIR"
    echo ""
    
    if ls "$BACKUP_DIR"/relasi4warna_backup_*.tar.gz 1> /dev/null 2>&1; then
        ls -lh "$BACKUP_DIR"/relasi4warna_backup_*.tar.gz | awk '{print $9, "(" $5 ")"}'
    else
        echo "No backups found."
    fi
}

# Main
case "$1" in
    --restore)
        if [ -z "$2" ]; then
            echo "Usage: $0 --restore /path/to/backup.tar.gz"
            exit 1
        fi
        restore_backup "$2"
        ;;
    --list)
        list_backups
        ;;
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)           Create backup to default location (/app/backups)"
        echo "  /path/to/dir        Create backup to specified directory"
        echo "  --restore FILE      Restore from backup file"
        echo "  --list              List available backups"
        echo "  --help              Show this help"
        echo ""
        echo "Environment variables:"
        echo "  MONGO_URL           MongoDB connection URL"
        echo "  DB_NAME             Database name (default: relasi4warna)"
        echo "  BACKUP_RETENTION_DAYS  Days to keep backups (default: 7)"
        ;;
    *)
        create_backup
        ;;
esac
