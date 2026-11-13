#!/bin/sh
# 容器入口：等数据库 → 跑迁移 → 启动 API
# 迁移放在每次启动时执行，TypeORM 会跳过已执行过的记录，重复跑是安全的。

set -e

echo "[entrypoint] 等待 MySQL 就绪 ..."
n=0
until node -e '
const mysql = require("mysql2/promise");
mysql.createConnection({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
}).then(c => c.end()).catch(() => process.exit(1));
'; do
  n=$((n + 1))
  if [ "$n" -ge 60 ]; then
    echo "[entrypoint] 等待超时（约 2 分钟）。请检查 .env 里的 DB_USER / DB_PASS，以及 db 容器日志。" >&2
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] 执行数据库迁移 ..."
./node_modules/.bin/typeorm -d dist/database/data-source.js migration:run

echo "[entrypoint] 启动 API ..."
exec node dist/main
