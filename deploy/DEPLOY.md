# 部署手册 · 学生家长工作台

面向一台 Ubuntu 24.04 x86_64 的单机部署。三个容器：`nginx`（静态前端 + 反代）、`api`（NestJS）、`db`（MySQL 8.4）。

## 部署清单（照着打勾）

- [ ] **0.1** 防火墙放行 80（顺手把 443 也加上）
- [ ] **0.2** 确认 Docker 已装（`docker --version`）；没装用 `| sudo sh`；`usermod -aG docker` 后**重新登录**
- [ ] **0.3** `free -h` 看 swap，已经是 `1.9Gi` 就跳过，`0B` 才需要加
- [ ] **0.4** `docker pull hello-world` 通不通？不通就配 registry mirror，`restart docker`（不是 `docker.socket`）
- [ ] **0.5** 预拉 `mysql:8.4`、`node:22-slim`、`nginx:stable-alpine`
- [ ] **2** 本地 `pnpm build` 出 `parents-vue/dist`
- [ ] **3** 上传到 `/opt/parents`，`ls -a` 核对层级，删掉 `api/.env`
- [ ] **4** 生成 `.env`，`grep -c` 必须输出 **6**
- [ ] **5** `build api` → `up -d` → `ps` 三个都 Up（db/api 要 healthy）
- [ ] **6** 三条 `curl` 通过，浏览器用 **`http://`** 打开
- [ ] **8** 备份先手工跑一次，再挂 cron（日志别写 `/var/log`）
- [ ] **10** 改成 SSH 密钥登录（可选，但强烈建议）

---

## 0. 服务器准备

### 0.1 防火墙放行

腾讯云轻量控制台 → 点进实例 → **防火墙** → 添加规则：

| 应用类型 | 协议端口 | 来源 |
|---|---|---|
| HTTP | TCP:80 | 0.0.0.0/0 |
| HTTPS | TCP:443 | 0.0.0.0/0 |

22 端口通常已由默认策略放行（能 SSH 登录就是证明），不要动它。

规则**加完立即生效，不用重启任何服务**。反过来说：容器都 `healthy`、`curl 127.0.0.1` 也通，但浏览器打不开 —— 九成是这里没放行。

### 0.2 装 Docker

先看有没有装过。腾讯云部分镜像会预装，重复跑官方脚本会覆盖你的 apt 源配置：

```bash
docker --version && docker compose version
```

两条都有版本号（Docker ≥ 20.10、Compose v2）就**跳过安装**，直接：

```bash
sudo systemctl enable --now docker
```

没有输出才装。**`sh` 前面必须带 `sudo`** —— 少了它，脚本内部写 `/usr/lib/systemd` 时会触发 polkit 认证，报一串 `AUTHENTICATING FOR org.freedesktop.systemd1...` / `pam_authenticate failed`：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker    # 是 docker，不是 docker.socket
```

把当前用户加进 docker 组，之后敲 `docker` 不用每次 `sudo`：

```bash
sudo usermod -aG docker $USER
```

**这条必须重新登录才生效**（`exit` 断开重连）。验证：

```bash
docker ps     # 不报 permission denied 就成了
```

### 0.3 检查 swap（2G 内存的机器必看）

先看现有容量，**别急着加**：

```bash
free -h
```

如果 `Swap` 行不是 `0B`，本节直接跳过 —— 腾讯云的镜像常预置约 2G swap，再执行下面的命令会多建一块，白占磁盘。

如果确实没有，云服务器默认是不开 swap 的。2G 内存下跑一次镜像构建时，`tsc` 编译峰值能到 700M–1G，而 MySQL 此时已占 400M，很容易顶到天花板被 OOM kill。补一块兜底：

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab   # 重启后自动挂载
free -h                                            # 确认 Swap 行显示 2.0Gi
```

无论原有还是新加，都确认一下是否开机自动挂载（不然重启后就没了）：

```bash
swapon --show
grep -i swap /etc/fstab
```

> swap 保护的是宿主机和构建过程。容器里的 `mem_limit` 是硬限制，**不会被 swap 兜住** —— 所以 `docker-compose.yml` 的内存上限也要按机器规格配对，见第 5 节。

### 0.4 配置镜像加速（国内服务器基本必做）

先测 Docker Hub 通不通：

```bash
docker pull hello-world
```

如果报 `dial tcp 199.59.150.43:443: i/o timeout`，那**不是慢，是 DNS 被污染**：`199.59.150.43` 属于 Twitter 的地址段，跟 Docker Hub 毫无关系，连的地址本身就是错的。配 mirror：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker    # 关键：必须是 docker.service
```

**别写成 `systemctl restart docker.socket`。** socket 单元只负责端口监听，不会让 `dockerd` 重新读 `daemon.json`，改了等于没改 —— 这是最容易自欺欺人的一处。

验证 mirror 真被读到了：

```bash
docker info --format '{{json .RegistryConfig.Mirrors}}'
```

输出应为 `["https://mirror.ccs.tencentyun.com/"]`。若是 `[]` 或 `null`，说明没生效，重跑 `restart docker`。多个 mirror 会按顺序尝试，全不通时退回公网直连。

> `mirror.ccs.tencentyun.com` 是腾讯云 CVM 的**内网**地址，轻量应用服务器上不保证可用。不通不是配错了，换下一组即可。

### 0.5 预拉三个镜像

构建时再拉基础镜像，会变成「一边下载一边编译」，2G 机器上内存峰值叠加，也不容易看出卡在哪。提前单独拉掉：

```bash
docker pull mysql:8.4            # 约 600 MB，最久
docker pull node:22-slim         # 约 200 MB
docker pull nginx:stable-alpine  # 约 50 MB

docker images                    # 三行都在就齐了
```

合计约 850 MB，40G 盘绰绰有余（`mysql` 显示 1.12G 是解压后的磁盘占用，正常）。走内网 mirror 通常几分钟；**进度条看着不动也别 Ctrl+C**，`mysql` 那个本身就要下一阵。

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

先在服务器上建目录，并把所有权交给当前用户 —— `/opt` 属于 root，不 `chown` 的话上传会报 permission denied：

```bash
sudo mkdir -p /opt/parents/{api,web,nginx/certs,backups}
sudo chown -R $USER:$USER /opt/parents
```

### 方式 A：WinSCP 拖拽（推荐，不用记路径）

连接参数：协议 **SFTP**、主机填公网 IP、端口 22、用户名 `ubuntu`、密码即 SSH 密码。

| 本机 | 传到服务器 |
|---|---|
| `parents-vue\dist\` **里面的内容** | `/opt/parents/web/` |
| `server\` 里除 `node_modules`、`dist` 外的全部 | `/opt/parents/api/` |
| `deploy\docker-compose.yml`、`.env.example`、`backup.sh` | `/opt/parents/` |
| `deploy\nginx\default.conf` | `/opt/parents/nginx/` |

三个必踩的坑：

1. **WinSCP 默认隐藏点开头的文件。** 不开「显示隐藏文件」，`.dockerignore` 和 `.env.example` 根本看不见，也传不上去。开关在 `选项 → 首选项 → 面板`。
2. **别传 `node_modules` 和 `dist`。** 几万个文件，传很久且完全没用，镜像里会重新 `npm ci` + `nest build`。
3. **`web/` 别多一层。** 必须是 `/opt/parents/web/index.html`，不能是 `/opt/parents/web/dist/index.html`，否则 nginx 找不到首页（403 或空白页）。

### 方式 B：命令行

在项目根目录用 Git Bash 执行（自动排除 `node_modules` 和本地 `.env`）：

```bash
tar -czf - \
  --exclude=node_modules --exclude=dist --exclude=.env \
  --exclude='*.tsbuildinfo' --exclude=.git \
  server | ssh $USER@<服务器IP> \
  "mkdir -p /opt/parents && rm -rf /opt/parents/api && tar -xzf - -C /opt/parents && mv /opt/parents/server /opt/parents/api"

scp -r "parents-vue/dist/." $USER@<服务器IP>:/opt/parents/web/
scp deploy/docker-compose.yml deploy/.env.example deploy/backup.sh $USER@<服务器IP>:/opt/parents/
scp deploy/nginx/default.conf $USER@<服务器IP>:/opt/parents/nginx/
```

### 传完必须核对层级

```bash
ls -a /opt/parents
ls -a /opt/parents/api
ls -a /opt/parents/nginx
```

用 `-a`，否则点开头的文件不显示，看不出漏传。判断标准只有三条：

- `api/` 里能**直接**看到 `Dockerfile`、`entrypoint.sh`、`package.json`、`src`
- `web/` 里能**直接**看到 `index.html` 和 `assets`
- `nginx/` 里有 `default.conf` 和 `certs`

### 清掉两个不该上服务器的文件

```bash
rm -f /opt/parents/api/.env /opt/parents/api/tsconfig.tsbuildinfo
```

`api/.env` 是本机开发用的（`DB_PASS=ParentsDev_2026` 这类开发值）。compose 注入的环境变量优先级更高，它不会立刻出错，但会变成一个**隐藏的状态源** —— 哪天 compose 少传一个变量，旧值就悄悄生效了，排查起来非常折磨；而且它是明文密码。

`tsconfig.tsbuildinfo` 只是本地编译缓存，服务器会重新编译，留着没用。

如果 `.dockerignore` 或 `.env.example` 漏传了，直接在服务器上补，跟传上去完全等价：

```bash
cat > /opt/parents/api/.dockerignore <<'EOF'
node_modules
dist
*.tsbuildinfo
.env
.env.*
!.env.example
.git
scripts
EOF
```

`.env.example` 的完整内容在仓库 `deploy/.env.example`，第 4 节会基于它生成真正的 `.env`。

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

# 有值的键应该有 6 个：DB_PASS / MYSQL_ROOT_PASSWORD / JWT_SECRET / DB_NAME / DB_USER / JWT_EXPIRES
grep -c '^[A-Z_]*=..*' .env

# 再看三个密钥的实际长度，不暴露内容
awk -F= '/^(DB_PASS|MYSQL_ROOT_PASSWORD|JWT_SECRET)=/{print $1, length($2)" 字符"}' .env
```

**第一条必须输出 `6`**，三个密钥长度都应在 28 字符以上。少于 6 或某个是 0，说明对应的 `sed` 没匹配上（通常是 `.env.example` 里的键名被改过），别急着往下走。

> **重要**：`DB_PASS` 只在 MySQL **首次初始化**时写入。库已经建好之后再改 `.env` 上的密码，容器里的账号密码不会跟着变，会一直连不上。真要改，得进库执行 `ALTER USER`。

`.env` 生成后**立刻另存一份到本地密码管理器**。它比数据库备份更关键：有它加 `.sql.gz` 才能原样重建；丢了它，即使有备份，恢复时也会因为密码对不上而连不进库。

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

预期 `db` 先健康、`api` 再起来。

实测参考（2核2G / 3M、镜像已预拉）：`build api` **约 28 秒**（`npm ci` 11s + `nest build` 6s，依赖走 npmmirror 源所以很快），`db` 首次初始化到 `healthy` **约 16 秒**，`api` 转 `healthy` 再 **十几秒**。如果机器上还在拉镜像，会明显慢一些。

`api` 首次启动要等 MySQL 起来再跑迁移，**前 1–2 分钟内反复重启是正常的**，别急着判断失败。跟一下日志：

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

### 怎么读 `docker compose ps`

```
NAME                        STATUS                      PORTS
workstation-parents-db-1    Up (healthy)                3306/tcp, 33060/tcp
workstation-parents-api-1   Up (healthy)                3000/tcp
workstation-parents-web-1   Up                          0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

三个要点：

- `db`、`api` 必须是 **`(healthy)`**。`api` 的 healthcheck 真的会去 `fetch` 一次 `/api/health`，拿到 200 才转 healthy —— 这个状态过了，说明「等到库 + 迁移跑完 + 端口监听」三件事都成了。
- `api` 的 PORTS 显示 `3000/tcp`（**没有** `0.0.0.0:` 前缀）→ 只在容器内网可见，公网访问不到，这是安全的。
- `db` 同理，`3306` 完全不对外，只有 api 容器能连。

**`web` 报 `port is already allocated`** 说明 80 被预装服务占了（云镜像常见），停掉它：

```bash
sudo ss -ltnp 'sport = :80'          # 先看是谁
sudo systemctl disable --now nginx 2>/dev/null
docker compose up -d
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

| 检查 | 期望 | 含义 |
|---|---|---|
| `/api/health` | `{"ok":true,"db":"up"}` | API 活着，**且真连上了数据库** |
| `/` | `HTTP/1.1 200 OK` | nginx 正常 |
| `/skills` | `HTTP/1.1 200 OK` | **history 路由 fallback 生效**，刷新子页面不会 404 |

第三条最容易漏。只配前端不改 nginx，这里就是 404。

### 浏览器访问：必须是 `http://`，不能是 `https://`

打开 **`http://<服务器IP>/`**。

地址栏里如果变成 `https://...`，一定会 `ERR_CONNECTION_TIMED_OUT` —— 因为备案前 `default.conf` **只有 `listen 80`，没有 443 的 server 块**，443 虽然做了端口映射但容器里没有进程监听。这不是服务坏了。

Chromium 系浏览器（Edge / Chrome）会把裸 IP 自动补成 https，所以要手动打全 `http://` 前缀。嫌麻烦就关掉自动升级：`edge://settings/privacy` → 安全 → 「始终使用安全连接」。

> 证书只能绑域名、不能绑 IP，Let's Encrypt 不签发 IP 证书。所以备案下来之前，**不要为了凑 https 去搞自签证书** —— 每台设备都弹安全警告，且不解决任何问题。什么时候能上 https 见第 7 节。

看到欢迎页 → 注册账号 → 记一条数据，整条链路就通了。

### 再从数据库侧确认一次

页面显示成功不代表写进了库（可能是本地缓存）。用一条 `SELECT` 验证：

```bash
cd /opt/parents
docker compose exec db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "show tables; select count(*) as users from users;"'
```

能看到迁移建的表、`users` 计数 ≥ 1，才说明真正的持久化通了。

---

## 7. 备案与 HTTPS

**服务器在华东-苏州（大陆地域），域名必须完成 ICP 备案才能用 80/443 访问。**

- **备案期间**：用 `http://<IP>/` 自用没问题（注意是 http，见第 6 节）。如果 IP 也被拦，把 compose 的端口改成 `"8080:80"`，用 `http://<IP>:8080/` 访问。
- **备案通过后**：域名解析到 IP，防火墙补上 HTTPS(443) 规则，换 `nginx/https.conf.example`，再申请证书。
- **提前把 443 的防火墙规则加好**：现在用不到，但申请证书时 `certbot` 要走 80 做校验、之后又要 443 才能访问，等到那一步再排查会多绕一圈。

```bash
# 申请证书（先把 https.conf.example 覆盖 default.conf，再 docker compose restart web）
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
ls -lh /opt/parents/backups/    # 看到 .sql.gz 才算成功
```

挂进定时任务（这条写法会**保留已有任务**，比 `crontab -e` 手动编辑安全）：

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/parents/backup.sh >> /opt/parents/backups/backup.log 2>&1") | crontab -
crontab -l
```

> 日志**不要**写 `/var/log/`。cron 以 `ubuntu` 身份运行，而 `/var/log` 属 root，重定向会失败，而且失败是静默的 —— 你以为配好了，其实一次都没跑。写到 `/opt/parents/backups/` 下面最省事。

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

**只改了前端的话，不用 build。** `web/` 是以只读卷挂载进 nginx 容器的，把新的 `dist` 内容覆盖进 `/opt/parents/web/` 就即时生效。唯一要注意的是 `index.html` 在 `default.conf` 里配了 `no-cache`，但浏览器可能仍缓存着旧的 `index.html`，让用户强刷一次（`Ctrl+F5`）即可。

**只改了 `default.conf` 的话：**

```bash
docker compose exec web nginx -t && docker compose restart web
```

先用 `nginx -t` 验语法，省得改错一个分号就整站 502。

---

## 10. SSH 密钥登录（建议做）

公网 22 端口天天被扫，密码登录被爆破只是时间问题。改密钥之后关掉密码认证，安全性提升一个量级。

**一条保命规则：在另一个终端确认密钥能登录之前，不要断开当前这个会话。**

### 10.1 本机生成密钥

```bash
ssh-keygen -t ed25519 -C "parents-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub      # 复制这一整行
```

私钥是 `~/.ssh/id_ed25519`（**没有** `.pub` 后缀的那个），绝不能外传。

### 10.2 装到服务器

在服务器上执行（公钥整行粘进去，单引号别丢）：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAA...你的公钥... parents-server' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys      # 能看到那行才对
```

用 `>>` 追加，不要用 `>`，否则会覆盖云厂商注入的其他公钥。

### 10.3 验证密钥（别跳）

本机**新开一个终端**，原会话留着：

```bash
ssh -i ~/.ssh/id_ed25519 -o PasswordAuthentication=no ubuntu@<服务器IP>
```

`-o PasswordAuthentication=no` 是故意禁掉密码 —— 只要进得去，就一定是密钥生效，不会误判成「密码登录成功」。进不去就先解决，**别往下走**。

### 10.4 关闭密码登录

Ubuntu 24.04 有个坑：`/etc/ssh/sshd_config.d/` 下的文件会**覆盖**主配置（`Include` 在文件顶部，而 sshd 是「先读到的设置生效」）。腾讯云镜像常在这里放 `PasswordAuthentication yes`，只改主文件无效。

先看现状：

```bash
sudo ls /etc/ssh/sshd_config.d/
sudo sshd -T | grep -iE '^(passwordauthentication|kbdinteractiveauthentication)'
```

写一个 **`00` 开头**的文件（字母序最前，最先被读，能压过其他文件）：

```bash
sudo tee /etc/ssh/sshd_config.d/00-disable-password.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF

sudo sshd -t
sudo sshd -T | grep -iE '^(passwordauthentication|kbdinteractiveauthentication)'
```

**两条都必须显示 `no`** 才继续。还是 `yes` 的话，说明有更靠前的文件在覆盖，把 `ls` 结果拿出来看。

确认后重载（Ubuntu 24.04 服务名是 **`ssh`**，不是 `sshd`）：

```bash
sudo systemctl reload ssh
```

### 10.5 双向验证

```bash
# 密码应该被拒
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password ubuntu@<IP>
# 期望：Permission denied (publickey)

# 密钥应该直接进
ssh -i ~/.ssh/id_ed25519 ubuntu@<IP>
```

### 10.6 万一被锁在外面

腾讯云轻量控制台 → 实例 → 右上角「**登录**」（WebShell/VNC），用 `ubuntu` 账号密码进去：

```bash
sudo rm /etc/ssh/sshd_config.d/00-disable-password.conf
sudo systemctl reload ssh
```

所以 10.3 那步真的不能省。

---

## 11. 排错对照

| 症状 | 原因 | 处理 |
|---|---|---|
| `systemctl` 报 `AUTHENTICATING FOR org.freedesktop.systemd1`、`pam_authenticate failed` | 普通用户执行，缺 `sudo` | 命令前加 `sudo`；装 Docker 用 `\| sudo sh` |
| `docker ps` 报 `permission denied` | 不在 docker 组，或加了组没重新登录 | `sudo usermod -aG docker $USER` 后 `exit` 重连 |
| `docker pull` 报 `dial tcp 199.59.150.43:443: i/o timeout` | DNS 污染，`199.59.150.43` 是 Twitter 地址段，不是 Docker Hub | 配 registry mirror，见第 0.4 节 |
| 配了 mirror 但 `docker info` 里还是空 | 重启的是 `docker.socket`，`dockerd` 没重读 `daemon.json` | `sudo systemctl restart docker` |
| WinSCP 看不到 `.dockerignore` / `.env.example` | 默认隐藏点开头的文件 | `选项 → 首选项 → 面板` 勾「显示隐藏文件」 |
| 首页 403 / 空白，`web/` 里没看到 `index.html` | 多传了一层，变成 `web/dist/index.html` | 把 `dist` 里的内容直接放到 `web/` |
| 浏览器 `https://IP` 报 `ERR_CONNECTION_TIMED_OUT` | 备案前 `default.conf` 只有 `listen 80`，没有 443 的 server 块 | 改用 `http://IP/`，见第 6 节 |
| 浏览器 `http://IP` 超时，但 `curl 127.0.0.1` 正常 | 腾讯云防火墙没放行 80 | 控制台防火墙添加 HTTP(80)，来源 `0.0.0.0/0` |
| 导入备份报 **413** | nginx 的 `client_max_body_size` 还是默认 1M | 确认 `default.conf` 是 `32m`，`docker compose restart web` |
| 刷新 `/skills` **404** | 缺 `try_files ... /index.html` | 检查 `default.conf` 里的 `location /` |
| 所有接口 **404** | `proxy_pass` 结尾多写了 `/`，把 `/api` 前缀剥掉了 | 改成 `proxy_pass http://api:3000;` |
| **502** Bad Gateway | api 容器没起来 | `docker compose logs api`，多半是数据库连不上或迁移失败 |
| api 反复重启，日志停在「等待 MySQL」 | `.env` 里 `DB_PASS` 与库里不一致 | 用 root 进库 `ALTER USER 'parents_app'@'%' IDENTIFIED BY '新密码';` |
| api 反复重启，`docker inspect` 显示 **ExitCode 137** | 内存不足被 OOM kill（构建与 MySQL 抢内存） | 先 `docker compose build api` 再 `up -d`；确认已有 swap；核对第 5 节的上限配对 |
| 构建时整机卡死、SSH 掉线 | 2G 机器上编译峰值吃满内存 | 停库再构建：`docker compose stop db && docker compose build api && docker compose up -d` |
| 页面能开但登录失败 | 改了 `JWT_SECRET`，旧 token 全部失效 | 重新登录即可，正常现象 |
| cron 备份从来没跑过 | 日志重定向到 `/var/log/`，`ubuntu` 无写权限，失败是静默的 | 日志改到 `/opt/parents/backups/backup.log` |
| 磁盘快满 | 备份堆积 / Docker 镜像层 | `du -sh /var/lib/docker`，`docker system prune -af` |

日常巡检一条命令：

```bash
docker compose ps && df -h / && free -h
```
