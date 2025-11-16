# Admin Panelni Ishlatish Qo'llanmasi

## 1. Birinchi Admin Yaratish

Botni ishga tushirishdan oldin bitta super admin yaratishingiz kerak.

### MongoDB Atlas orqali qo'lda qo'shish

1. MongoDB Atlas'ga kiring: https://cloud.mongodb.com
2. Cluster → Collections → `admins` collectionini tanlang
3. "Insert Document" tugmasini bosing
4. Quyidagi JSON'ni kiriting (o'zingiz uchun o'zgartiring):

```json
{
  "username": "admin",
  "password": "$2a$10$yourhashedpasswordhere",
  "telegramId": 123456789,
  "role": "admin",
  "createdAt": { "$date": "2024-11-15T00:00:00Z" }
}
```

**Muhim:** Password'ni hash qilish uchun:

```bash
# Node.js REPL orqali
node
> const bcrypt = require('bcryptjs')
> bcrypt.hashSync('your_password', 10)
'$2a$10$...' # Bu hash'ni copy qiling
```

### Script orqali yaratish

`scripts/create-admin.js` faylini yarating:

```javascript
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("../src/models/Admin");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const admin = new Admin({
      username: "admin",
      password: "your_secure_password", // Auto-hash qilinadi
      telegramId: 123456789, // O'zingizning Telegram ID
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin yaratildi!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    process.exit(1);
  }
}

createAdmin();
```

Ishga tushirish:

```bash
node scripts/create-admin.js
```

## 2. Frontend Ishga Tushirish

### Development Mode

```bash
cd admin
npm install
npm run dev
```

Browser'da oching: http://localhost:5173

### Production Build

```bash
cd admin
npm run build
```

Build fayllar `admin/dist` papkasiga chiqadi.

## 3. Production Serverni Ishga Tushirish

```bash
# Backend serverni ishga tushirish
NODE_ENV=production npm start
```

Server `http://localhost:3000` da ishga tushadi va:

- Bot ishlaydi
- API `/api/v1/*` da mavjud
- Admin panel `/` da serve qilinadi

## 4. Admin Panel Funksiyalari

### Login

1. Browser'da `http://localhost:3000` ga o'ting
2. Username va password kiriting
3. "Kirish" tugmasini bosing

### Guruhlar

**Yangi guruh qo'shish:**

1. "Guruhlar" tabini oching
2. Forma to'ldiring:
   - **Guruh nomi:** Masalan "VIP Guruh"
   - **Telegram ID:** Guruhning ID'si (masalan `-1001234567890`)
   - **Promocode:** 6 xonali kod (masalan `VIP001`)
3. "Qo'shish" tugmasini bosing

**Guruh holatini o'zgartirish:**

- "Enable/Disable" tugmasini bosing

**Guruh foydalanuvchilari:**

- Promocode yonidagi "Users" havolasini bosing

### Statistika

"Statistika" tabida:

- Jami kodlar
- Ishlatilgan kodlar
- Ishlatilmagan kodlar
- Jami foydalanuvchilar
- Foydalanish foizi

## 5. Telegram ID Olish

### Guruh ID'sini olish:

1. Botni guruhga admin sifatida qo'shing
2. Botga `/start` yuboring yoki mention qiling
3. Bot loglarida yoki Telegram API orqali ID'ni toping

**Yoki:**

Script yarating `scripts/get-chat-id.js`:

```javascript
require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("message", (ctx) => {
  console.log("Chat ID:", ctx.chat.id);
  console.log("Chat Type:", ctx.chat.type);
  ctx.reply(`Chat ID: ${ctx.chat.id}`);
});

bot.launch();
```

Ishga tushirish:

```bash
node scripts/get-chat-id.js
```

### Shaxsiy Telegram ID:

Botga [@userinfobot](https://t.me/userinfobot) yuboring yoki:

```bash
# Bot loglarida
console.log(ctx.from.id)
```

## 6. Troubleshooting

### Admin login ishlamayapti

1. `.env` faylida `JWT_SECRET` borligini tekshiring
2. MongoDB'da admin record borligini tekshiring
3. Password to'g'ri hash qilinganini tekshiring

### Guruh qo'shilmayapti

1. Telegram ID to'g'ri ekanligini tekshiring (negative bo'lishi kerak)
2. Promocode unique ekanligini tekshiring
3. API loglarini ko'ring

### Frontend build xatosi

```bash
cd admin
rm -rf node_modules dist
npm install
npm run build
```

### Backend ishlamayapti

1. `.env` faylini tekshiring
2. MongoDB ulanishini tekshiring
3. Port band emasligini tekshiring

## 7. API Testing (Postman/curl)

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

Javob:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "admin": {
      "id": "...",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### Guruh qo'shish

```bash
curl -X POST http://localhost:3000/api/v1/groups/promo-groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP Guruh",
    "telegramId": "-1001234567890",
    "promocode": "VIP001"
  }'
```

### Statistika

```bash
curl -X GET http://localhost:3000/api/v1/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 8. Environment Variables

### Backend (`.env`)

```bash
# Bot
BOT_TOKEN=your_bot_token
ADMIN_GROUP_ID=-100123456789

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_long_random_secret

# Server
PORT=3000
NODE_ENV=production

# Admin
ADMIN_IDS=123456789,987654321
```

### Frontend (`admin/.env`)

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

Production uchun:

```bash
VITE_API_URL=https://your-domain.com/api/v1
```

## 9. Deploy Workflow

1. **Backend build:**

   ```bash
   npm install --production
   ```

2. **Frontend build:**

   ```bash
   cd admin
   npm install
   npm run build
   cd ..
   ```

3. **PM2 bilan ishga tushirish:**

   ```bash
   pm2 start src/index.js --name nerobot
   pm2 save
   ```

4. **Nginx sozlash:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

Batafsil deploy qo'llanmasi: [DEPLOYMENT.md](../docs/DEPLOYMENT.md)
