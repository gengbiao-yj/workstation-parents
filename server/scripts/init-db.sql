-- 学生家长工作台 · 本地开发库初始化脚本
-- 用法：在项目根目录执行
--   "D:/soft/MySql/install/bin/mysql.exe" -u root -p < server/scripts/init-db.sql
-- MySQL 9.x 已移除 mysql_native_password，这里统一使用默认的 caching_sha2_password

CREATE DATABASE IF NOT EXISTS `workstation_parents`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'parents_app'@'localhost' IDENTIFIED BY 'ParentsDev_2026';
ALTER USER 'parents_app'@'localhost' IDENTIFIED BY 'ParentsDev_2026';

CREATE USER IF NOT EXISTS 'parents_app'@'127.0.0.1' IDENTIFIED BY 'ParentsDev_2026';
ALTER USER 'parents_app'@'127.0.0.1' IDENTIFIED BY 'ParentsDev_2026';

GRANT ALL PRIVILEGES ON `workstation_parents`.* TO 'parents_app'@'localhost';
GRANT ALL PRIVILEGES ON `workstation_parents`.* TO 'parents_app'@'127.0.0.1';

FLUSH PRIVILEGES;

SELECT '数据库与账号已就绪' AS message;
