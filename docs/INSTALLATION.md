# LifecycleIQ — Installation Guide

## Deployment Options

| Option | Best for | Effort |
|--------|----------|--------|
| [A. Docker Compose (standard server)](#option-a-standard-server) | Internal on-prem, cloud VM | Low |
| [B. Raspberry Pi 5](#option-b-raspberry-pi-5) | Home lab, small office | Low |

Both options run the full stack (Next.js web + NestJS API + PostgreSQL) in Docker. No code changes are needed — just configure `.env` and start the containers.

---

## Prerequisites (both options)

- A domain name **or** internal hostname/IP pointing to the server
- Ports 80 and 443 open in your firewall
- Git installed on the server

For SSL you can use either:
- **Let's Encrypt** — free, auto-renewing, requires a publicly accessible domain
- **Self-signed cert** — works on internal networks, requires one-time trust installation on each user's browser

---

## Option A: Standard Server

Tested on Ubuntu 22.04. Works on any modern Debian-based Linux.

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world   # verify
```

### 2. Install nginx + certbot

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Clone the repo

```bash
git clone https://github.com/yanceydd-ai/lifecycleIQ.git
cd lifecycleIQ
```

### 4. Configure environment

```bash
cp .env.example .env
nano .env
```

Required values:

```
POSTGRES_USER=lifecycleiq
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET=<64-char-random-string>
AUTH_SECRET=<32-char-random-string>
NEXTAUTH_URL=https://yourdomain.com

# Microsoft Entra ID SSO (leave blank to use email/password only)
AUTH_ENTRA_CLIENT_ID=
AUTH_ENTRA_CLIENT_SECRET=
AUTH_ENTRA_TENANT_ID=
SSO_INTERNAL_SECRET=<32-char-random-string>

# Email alerts (leave SMTP_HOST blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=lifecycleiq@yourdomain.com
ALERT_TO_EMAIL=itadmin@yourdomain.com
```

Generate random strings with:
```bash
openssl rand -hex 32
```

### 5a. SSL — Let's Encrypt (public domain)

```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Configure nginx:

```bash
sudo nano /etc/nginx/sites-available/lifecycleiq
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Enable cert auto-renewal:
```bash
sudo systemctl enable --now certbot.timer
```

### 5b. SSL — Self-signed cert (internal network)

```bash
sudo mkdir -p /etc/ssl/lifecycleiq

sudo openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/lifecycleiq/server.key \
  -out    /etc/ssl/lifecycleiq/server.crt \
  -subj "/CN=lifecycleiq.internal" \
  -addext "subjectAltName=IP:192.168.1.100,DNS:lifecycleiq.internal"
```

Replace `192.168.1.100` and `lifecycleiq.internal` with your server's actual IP and/or hostname.

Configure nginx:

```bash
sudo nano /etc/nginx/sites-available/lifecycleiq
```

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/ssl/lifecycleiq/server.crt;
    ssl_certificate_key /etc/ssl/lifecycleiq/server.key;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

#### Trusting the self-signed cert on user machines

Copy the cert off the server first:
```bash
scp user@192.168.1.100:/etc/ssl/lifecycleiq/server.crt ~/lifecycleiq.crt
```

**Windows:**
1. Double-click `lifecycleiq.crt` → Install Certificate
2. Select Local Machine → Trusted Root Certification Authorities → Finish
3. Restart browser

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ~/lifecycleiq.crt
```
Restart browser.

**Linux (Chrome/Chromium):**
```bash
sudo cp ~/lifecycleiq.crt /usr/local/share/ca-certificates/lifecycleiq.crt
sudo update-ca-certificates
```
Restart browser.

**Linux (Firefox):**
Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import → select the `.crt` file → trust for websites.

### 6. Enable and test nginx

```bash
sudo ln -s /etc/nginx/sites-available/lifecycleiq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl enable --now nginx
```

### 7. Update Entra ID redirect URI (if using SSO)

In Azure portal → App registrations → LifecycleIQ → Authentication, update the redirect URI to:
```
https://yourdomain.com/api/auth/callback/microsoft-entra-id
```

### 8. Build and start the stack

```bash
docker compose up -d --build
```

First build takes 3–5 minutes. Check status:

```bash
docker compose ps
docker compose logs -f api    # watch for "Application is running on port 3001"
```

Open `https://yourdomain.com` in a browser.

### 9. Updating to a new version

```bash
git pull
docker compose up -d --build
```

The API container runs `prisma migrate deploy` on startup — schema changes apply automatically.

---

## Option B: Raspberry Pi 5

The project already targets ARM64. All Docker images are multi-arch. No code changes needed.

### Hardware recommendations

| | Minimum | Recommended |
|--|---------|-------------|
| Model | Pi 5 4GB | Pi 5 8GB |
| Boot | SD card | SD card |
| Data storage | USB 3.0 SSD | NVMe via PCIe HAT |
| Cooling | Passive heatsink | Official active cooler |

**Do not run PostgreSQL on an SD card** — sustained write load will wear it out within months. Boot from SD, store data on an external SSD.

### 1. Flash the OS

Download **Raspberry Pi OS Lite (64-bit)** from [raspberrypi.com/software](https://www.raspberrypi.com/software/). Flash with Raspberry Pi Imager. In the imager settings, pre-configure hostname, SSH, username/password, and WiFi.

### 2. First boot — update and configure storage

SSH into the Pi:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

Set up external SSD (replace `sdX` with your device from `lsblk`):

```bash
sudo mkfs.ext4 /dev/sdX
sudo mkdir /data
echo '/dev/sdX /data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a
sudo mkdir -p /data/docker
```

Configure Docker to store data on the SSD:

```bash
sudo mkdir -p /etc/docker
echo '{"data-root": "/data/docker"}' | sudo tee /etc/docker/daemon.json
```

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world   # verify
```

### 4–9. Follow Option A steps

From here, follow **Option A steps 2–9** exactly. The Docker images detect ARM64 automatically.

> **Note:** The first `docker compose up --build` takes 10–15 minutes on a Pi 5 while compiling NestJS and Next.js. Subsequent starts are fast.

Verify you're running ARM64 containers after the first build:
```bash
docker inspect lifecycleiq-api-1 | grep Architecture
# "Architecture": "arm64"
```

---

## Troubleshooting

**`docker compose up` fails with database connection error on first run**

The API starts before PostgreSQL is fully ready. Wait 10 seconds and run `docker compose up -d` again. The healthcheck in `docker-compose.yml` should prevent this, but slow storage (SD card) can cause it.

**`prisma migrate deploy` fails with "table already exists"**

The database has leftover state from a previous `db push` deployment. Wipe it and restart:
```bash
docker compose down -v   # WARNING: deletes all data
docker compose up -d
```

**Self-signed cert — browser still shows warning after trusting**

Make sure the cert includes the SAN for the exact IP/hostname you're using to access the app. Regenerate with the correct `-addext "subjectAltName=..."` value if needed.

**Entra SSO redirect mismatch error**

The redirect URI in the Azure portal must exactly match `NEXTAUTH_URL` in `.env`, including the protocol (`https://`). Update both and restart: `docker compose restart web`.

**Email alerts not sending**

Run a quick SMTP test from the server:
```bash
docker compose exec api node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({host:'YOUR_SMTP_HOST',port:587,auth:{user:'USER',pass:'PASS'}});
t.sendMail({from:'a@b.com',to:'a@b.com',subject:'test',text:'test'}).then(console.log).catch(console.error);
"
```
