# 部署手册 · 学生家长工作台

面向一台 Ubuntu 24.04 x86_64 的单机部署。三个容器：`nginx`（静态前端 + 反代）、`api`（NestJS）、`db`（MySQL 8.4）。

---

## 0. 服务器准备

安全组 / 防火墙放行 **22、80、443**。

```bash
# 装 Docker（官方脚本，会一起装上 compose 插件）
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 确认
docker --version && docker compose version
```

### 加 2G swap（2G 内存的机器必做）

云服务器默认不开 swap。2G 内存下跑一次镜像构建时，`tsc` 编译峰值能到 700M–1G，而 MySQL 此时已占 400M，很容易顶到天花板被 OOM kill。先补一块 swap 兜底：

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab   # 重启后自动挂载
free -h                                            # 确认 Swap 行显示 2.0Gi
```

> swap 保护的是宿主机和构建过程。容器里的 `mem_limit` 是硬限制，**不会被 swap 兜住** —— 所以 `docker-compose.yml` 的内存上限也要按机器规格配对，见第 5 节。

---

## 1. 目标目录结构

```
/opt/parents/
├── docker-compose.yml
├── .env                 ← 自己生成，不入库
├── api/                 ← 仓库 server/ 的内容
├── web/                 ← parents-vue/dist 的内容
├── nginx/
│   ├── default.conf
│   └── certs/           ← HTTPS 后放证书
├── backups/
└── backup.sh
```

---

## 2. 本地构建前端

后端**不用**在本地构建，镜像里会 `npm ci` + `nest build`。只有前端需要先出产物。

```bash
cd "parents-vue"
pnpm install      # 首次才需要
pnpm build        # 产出 dist/
```

---

## 3. 上传到服务器

在项目根目录用 Git Bash 执行（一条命令，会自动排除 `node_modules` 和本地 `.env`）：

```bash
tar -czf - \
  --exclude=node_modules --exclude=dist --exclude=.env \
  --exclude='*.tsbuildinfo' --exclude=.git \
  server | ssh root@<服务器IP> \
  "mkdir -p /opt/parents && rm -rf /opt/parents/api && tar -xzf - -C /opt/tmp-api && mv /opt/tmp-api/server /opt/parents/api && rmdir /opt/tmp-api"

scp -r "parents-vue/dist" root@<服务器IP>:/opt/parents/web
scp deploy/docker-compose.yml deploy/.env.example deploy/backup.sh root@<服务器IP>:/opt/parents/
scp deploy/nginx/default.conf root@<服务器IP>:/opt/parents/nginx/
```

嫌命令麻烦就上 WinSCP 拖拽，效果一样，注意 **不要**把本地的 `node_modules`、`dist`、`.env` 传上去。

在服务器上补两个空目录：

```bash
mkdir -p /opt/parents/nginx/certs /opt/parents/backups
```

---

## 4. 生成配置

```bash
cd /opt/parents
cp .env.example .env

# 三个密钥一次性生成并写入
sed -i "s|^DB_PASS=.*|DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')|" .env
sed -i "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')|" .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env

chmod 600 .env
grep -c '^.$' .env   # 确认三个值都填上了
```

> **重要**：`DB_PASS` 只在 MySQL **首次初始化**时写入。库已经建好之后再改 `.env` 上的密码，容器里的账号密码不会跟着变，会一直连不上。真要改，得进库执行 `ALTER USER`。

---

## 5. 启动

**分两步，不要用 `docker compose up -d --build` 一把梭。** 那样构建和 MySQL 启动可能重叠，2G 机器上编译峰值叠上 MySQL 的 400M 容易触发 OOM（表现为 `api` 反复重启、`docker inspect` 里 `ExitCode` 是 137）。

```bash
cd /opt/parents

# 第一步：单独编译 api 镜像，此时只有系统在跑，不和 MySQL 抢内存
docker compose build api

# 第二步：启动全部容器
docker compose up -d
docker compose ps
```

预期 `db` 先健康、`api` 再起来。首次拉镜像 + 编译，3M 带宽下约 3–6 分钟；`api` 首次启动还要等迁移跑完，**前 1–2 分钟内反复重启是正常的**，不要急着判断失败。跟一下日志：

```bash
docker compose logs -f api
```

看到这几行就算成功：

```
[entrypoint] 等待 MySQL 就绪 ...
[entrypoint] 执行数据库迁移 ...
[entrypoint] 启动 API ...
[Nest] xxx LOG [Bootstrap] API 已启动 → http://localhost:3000/api
```

### 内存上限怎么配对

三个 `mem_limit` 之和不要超过物理内存的 80%，给系统和 Docker daemon 留空间：

| 机器规格 | db | api | web | 合计 |
|---|---|---|---|---|
| **2G（当前配置）** | 768m | 512m | 128m | 1.4G |
| 4G 及以上 | 1g | 512m | 128m | 1.6G |

`db` 的 768m 是按 `innodb-buffer-pool-size=256M` + 连接/临时表开销算的，实际常驻 350–450M，余量充足。

**`api` 的 512m 不建议再往下压。** Node 22 的堆和 V8 预留需要空间，整库导入那种大 body 时压到 384m 容易被 OOM kill。

---

## 6. 验证

```bash
# 后端探活（应该返回 {"ok":true,"db":"up",...}）
curl -s http://127.0.0.1/api/health

# 前端首页
curl -sI http://127.0.0.1/ | head -1

# 前端路由 fallback（这个必须 200，不能 404）
curl -sI http://127.0.0.1/skills | head -1
```

浏览器打开 `http://<服务器IP>/`，走欢迎页 → 注册账号 → 数据同步到云端，就通了。

---

## 7. 备案与 HTTPS

**服务器在华东-苏州（大陆地域），域名必须完成 ICP 备案才能用 80/443 访问。**

- 备案期间：直接用 `http://<IP>/` 自用没问题；如果 IP 也被拦，把 compose 的端口改成 `"8080:80"` 用 `http://<IP>:8080/` 访问。
- 备案通过后：域名解析到 IP，换 `nginx/https.conf.example` 里的配置，证书用下面这条命令申请。

```bash
# 申请证书（先把 https.conf.example 改名覆盖 default.conf，并确认 nginx 已 reload）
docker run --rm \
  -v /opt/parents/nginx/certs:/etc/letsencrypt \
  -v /opt/parents/nginx/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d your-domain.com --email you@example.com \
  --agree-tos --no-eff-email
```

Let's Encrypt 证书 90 天有效，自用场景加个 cron 每天试着续一次就够：

```bash
0 4 * * 1 docker run --rm -v /opt/parents/nginx/certs:/etc/letsencrypt -v /opt/parents/nginx/www:/var/www/certbot certbot/certbot renew --webroot -w /var/www/certbot && docker compose -f /opt/parents/docker-compose.yml exec web nginx -s reload
```

---

## 8. 备份（别跳过）

```bash
chmod +x /opt/parents/backup.sh
/opt/parents/backup.sh          # 先手工跑一次，确认能出文件

crontab -e
# 每天凌晨 3 点
0 3 * * * /opt/parents/backup.sh >> /var/log/parents-backup.log 2>&1
```

本地留 14 天。**再往异地存一份**才算真备份 —— 服务器整机挂掉时，同盘备份一起没：

```bash
# 可选：同步到对象存储（以腾讯云 COS 为例，需先装 coscmd）
0 4 * * * coscmd upload -r /opt/parents/backups/ /parents-backup/
```

恢复：

```bash
gunzip -c backups/workstation_parents-20261112-030000.sql.gz | \
  docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

---

## 9. 发版更新

```bash
cd /opt/parents
./backup.sh                       # 先备份
# 重新上传 api/ 和 web/
docker compose build api          # 先编译，避开与 MySQL 抢内存
docker compose up -d              # 只会重建有变化的容器
```

迁移会在容器启动时自动执行，不需要手动跑。

---

## 10. 排错对照

| 症状 | 原因 | 处理 |
|---|---|---|
| 导入备份报 **413** | nginx 的 `client_max_body_size` 还是默认 1M | 确认 `default.conf` 是 `32m`，`docker compose restart web` |
| 刷新 `/skills` **404** | 缺 `try_files ... /index.html` | 检查 `default.conf` 里的 `location /` |
| 所有接口 **404** | `proxy_pass` 结尾多写了 `/`，把 `/api` 前缀剥掉了 | 改成 `proxy_pass http://api:3000;` |
| **502** Bad Gateway | api 容器没起来 | `docker compose logs api`，多半是数据库连不上或迁移失败 |
| api 反复重启，日志停在「等待 MySQL」 | `.env` 里 `DB_PASS` 与库里不一致 | 用 root 进库 `ALTER USER 'parents_app'@'%' IDENTIFIED BY '新密码';` |
| api 反复重启，`docker inspect` 显示 **ExitCode 137** | 内存不足被 OOM kill（构建与 MySQL 抢内存） | 先 `docker compose build api` 再 `up -d`；确认已加 swap；核对第 5 节的上限配对 |
| 构建时整机卡死、SSH 掉线 | 2G 机器上编译峰值吃满内存 | 停库再构建：`docker compose stop db && docker compose build api && docker compose up -d` |
| 页面能开但登录失败 | 改了 `JWT_SECRET`，旧 token 全部失效 | 重新登录即可，正常现象 |
| 磁盘快满 | 备份堆积 / Docker 镜像层 | `du -sh /var/lib/docker`，`docker system prune -af` |

日常巡检一条命令：

```bash
docker compose ps && df -h / && free -h
```
