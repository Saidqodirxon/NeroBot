# Admin Panel Deployment Guide

Bu qo'llanma bot va admin panelni production serverga o'rnatish bosqichlarini o'z ichiga oladi.

## 1. Server Tayyorlash

### 1.1 Ubuntu Server

```bash
# System update
sudo apt update
sudo apt upgrade -y

# Node.js o'rnatish (16.x versiya)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 o'rnatish
sudo npm install -g pm2

# Nginx o'rnatish
sudo apt install nginx -y
```

### 1.2 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 2. Loyihani Deploy Qilish

### 2.1 Loyihani Yuklab Olish

```bash
# Loyiha katalogini yaratish
mkdir -p /var/www/nerobot
cd /var/www/nerobot

# Git repo clone
git clone <repository-url> .

# Node.js dependencies o'rnatish
npm install

# Admin panel dependencies o'rnatish
cd admin
npm install
npm run build
cd ..
```

### 2.2 Environment Variables

`.env` faylini yarating:

```bash
# Production environment
NODE_ENV=production
PORT=3000
DOMAIN=https://your-domain.com

# MongoDB
MONGODB_URI=mongodb+srv://...

# Bot
BOT_TOKEN=your_bot_token
SUPPORT_USERNAME=your_support

# JWT
JWT_SECRET=your_secure_jwt_secret

# Admin
ADMIN_IDS=123456789,987654321
ADMIN_API_KEY=your_api_key
```

### 2.3 PM2 Configuration

`ecosystem.config.js` fayli:

```javascript
module.exports = {
  apps: [{
    name: 'nerobot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

PM2 orqali ishga tushirish:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2.4 Nginx Configuration

`/etc/nginx/sites-available/nerobot`:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSL configuration
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = your-domain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name your-domain.com;
    return 404;
}
```

Nginx sozlamalarini faollashtirish:

```bash
sudo ln -s /etc/nginx/sites-available/nerobot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 3. Admin Panel

### 3.1 React App Build

```bash
cd admin
npm run build
```

### 3.2 Environment Variables

Admin panel uchun `.env` fayli (`admin/.env`):

```bash
REACT_APP_API_URL=https://your-domain.com/api/v1
```

## 4. Domain va DNS

1. Domain registratordan A record qo'shing:
   ```
   A @ your-server-ip
   ```

2. www subdomain uchun CNAME record:
   ```
   CNAME www @
   ```

## 5. Monitoring va Logs

### 5.1 PM2 Logs

```bash
# Real-time logs
pm2 logs

# Specific app logs
pm2 logs nerobot

# Clear logs
pm2 flush
```

### 5.2 Nginx Logs

```bash
# Error logs
sudo tail -f /var/nginx/error.log

# Access logs
sudo tail -f /var/nginx/access.log
```

## 6. Backup Strategy

### 6.1 MongoDB Backup

```bash
# Backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%F)

# Restore
mongorestore --uri="mongodb+srv://..." /backup/2025-11-10
```

### 6.2 Automated Backup Script

`backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%F)
BACKUP_DIR="/backup/mongodb/$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="$MONGODB_URI" --out=$BACKUP_DIR

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR

# Remove original files
rm -rf $BACKUP_DIR

# Remove backups older than 7 days
find /backup/mongodb -name "*.tar.gz" -mtime +7 -exec rm {} \;
```

Cron job qo'shish:

```bash
0 0 * * * /backup/backup.sh
```

## 7. Security

### 7.1 Firewall (UFW)

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 7.2 Fail2Ban

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 8. SSL Renewal

Let's Encrypt sertifikatini avtomatik yangilash:

```bash
sudo certbot renew --dry-run
```

## 9. Monitoring

### 9.1 PM2 Monitoring

```bash
pm2 monit
```

### 9.2 System Monitoring

```bash
# htop o'rnatish
sudo apt install htop

# Monitoring
htop
```

## 10. Troubleshooting

### 10.1 Bot ishlamasa

1. `.env` faylini tekshiring
2. PM2 loglarini ko'ring: `pm2 logs`
3. Bot tokenni tekshiring
4. MongoDB ulanishni tekshiring

### 10.2 Admin panel ishlamasa

1. Nginx konfiguratsiyani tekshiring
2. SSL sertifikatni tekshiring
3. Frontend build papkasini tekshiring
4. API endpoints ishlayotganini test qiling

### 10.3 MongoDB ulanmasa

1. IP whitelist
2. Connection string
3. Database user credentials

## 11. Performance Optimization

### 11.1 Node.js

```bash
# Max old space size
NODE_OPTIONS="--max-old-space-size=4096"
```

### 11.2 Nginx

```nginx
# Worker connections
worker_processes auto;
events {
    worker_connections 1024;
}

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

## 12. Updates

### 12.1 Yangilash

```bash
# Stop app
pm2 stop nerobot

# Pull changes
git pull origin main

# Install dependencies
npm install

# Build admin panel
cd admin && npm install && npm run build

# Start app
pm2 start nerobot
```

## 13. Rollback

```bash
# Previous version'ga qaytish
git reset --hard HEAD~1
npm install
cd admin && npm install && npm run build
pm2 restart nerobot
```