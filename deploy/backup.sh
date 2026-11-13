#!/bin/sh
# 每日备份：mysqldump → gzip → 本地保留 14 天
# 用法：./backup.sh
# 建议加进 crontab：0 3 * * * /opt/parents/backup.sh >> /var/log/parents-backup.log 2>&1

set -e
cd "$(dirname "$0")"

KEEP_DAYS=14
DIR=./backups
mkdir -p "$DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DIR/workstation_parents-$STAMP.sql.gz"

# -T 是必须的：不加的话 docker 会分配伪终端，管道会拿到乱码
docker compose exec -T db sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --events --default-character-set=utf8mb4 "$MYSQL_DATABASE"' \
  | gzip > "$FILE"

echo "[$(date '+%F %T')] 备份完成 $FILE ($(du -h "$FILE" | cut -f1))"

find "$DIR" -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date '+%F %T')] 已清理 $KEEP_DAYS 天前的备份"
