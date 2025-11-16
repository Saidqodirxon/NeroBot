# NeroBot - Telegram Promo Kod Bot

Telegram bot promo kodlarni tekshirish va foydalanuvchilarni tegishli guruhlarga qo'shish uchun.

## 🚀 Xususiyatlar

- ✅ Foydalanuvchilarni ro'yxatdan o'tkazish (ism, telefon, shahar)
- 🎟 Promo kodlarni tekshirish va tegishli guruhlarga qo'shish
- � Guruhlar boshqaruvi va monitoring
- 🔐 JWT autentifikatsiya bilan himoyalangan admin panel
- �📊 MongoDB Atlas bilan ma'lumotlarni saqlash
- Reklama yuborish tizimi (rate limiting bilan)
- � React-based admin dashboard

## 📋 Talablar

- Node.js (v16 yoki yuqori)
- MongoDB Atlas hisobi
- Telegram Bot Token ([@BotFather](https://t.me/BotFather) dan)

## 🛠 O'rnatish

### Backend (Bot va API)

1. **Loyihani klonlash:**

```bash
git clone <repository-url>
cd NeroBot
```

2. **Paketlarni o'rnatish:**

```bash
npm install
```

3. **Atrof muhit o'zgaruvchilarini sozlash:**

```bash
cp .env.example .env
```

`.env` faylini tahrirlang:

- `BOT_TOKEN` - Telegram bot token
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT tokenlar uchun maxfiy kalit
- `ADMIN_IDS` - Admin Telegram ID'lari
- `PORT` - Server porti (default: 3000)

4. **Botni ishga tushirish:**

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### Frontend (Admin Panel)

1. **Admin panel katalogiga o'tish:**

```bash
cd admin
```

2. **Frontend dependencylarni o'rnatish:**

```bash
npm install
```

3. **Frontend environmentni sozlash:**

```bash
cp .env.example .env
```

`.env` faylini tahrirlang:

```bash
REACT_APP_API_URL=http://localhost:3000/api/v1
```

4. **Development serverini ishga tushirish:**

```bash
npm start
```

## 📝 Telegram Bot Buyruqlari

### Foydalanuvchilar uchun:

- `/start` - Botni ishga tushirish
- `/help` - Bot funksiyalari haqida ma'lumot
- `📝 📝 Promokodni kiritish` - Ro'yxatdan o'tish va guruhga qo'shilish
- `🛠 Qo'llab-quvvatlash` - Texnik yordam

### Admin buyruqlari:

- `/stats` - Statistika ko'rish
- `/broadcast` - Xabar yuborish

## 🔌 Admin API

### Autentifikatsiya

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

Javob:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "admin": {
      "id": "...",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### Endpoints

#### 1. Guruh va Promo kod qo'shish

```http
POST /api/v1/groups/promo-groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP Guruh",
  "telegramId": "-100123456789",
  "promocode": "VIP2024"
}
```

#### 2. Guruhlarni olish

```http
GET /api/v1/groups/promo-groups
Authorization: Bearer <token>
```

#### 3. Guruh foydalanuvchilari

```http
GET /api/v1/groups/promo-groups/:promocode/users
Authorization: Bearer <token>
```

## 💻 Admin Dashboard

### O'rnatish

```bash
cd admin
npm install
npm start
```

### Funksiyalar

1. **Guruhlar boshqaruvi**

   - Yangi guruh qo'shish
   - Guruh holatini o'zgartirish
   - Guruh statistikasi

2. **Foydalanuvchilar**

   - Ro'yxatdan o'tganlar
   - Guruhlar bo'yicha filter
   - Export CSV

3. **Statistika**
   - Umumiy statistika
   - Guruhlar bo'yicha
   - Vaqt oralig'i bo'yicha

## 🚀 Deployment

Deployment qo'llanmasi: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 🗄 Database Strukturasi

### User Model

```javascript
{
  telegramId: Number,
  username: String,
  firstName: String,
  lastName: String,
  name: String,
  phone: String,
  city: String,
  usedPromoCode: String,
  registeredAt: Date
}
```

### TargetGroup Model

```javascript
{
  name: String,
  telegramId: String,
  inviteLink: String,
  promocode: String,
  isActive: Boolean,
  createdAt: Date
}
```

### Admin Model

```javascript
{
  username: String,
  password: String, // hashed
  telegramId: Number,
  role: String,
  createdAt: Date
}
```

## 📱 Frontend Development

### Tech Stack

- React
- Material-UI
- Redux Toolkit
- React Router
- Axios
- Chart.js

### Strukturasi

```
admin/
├── src/
│   ├── components/     # UI komponentlar
│   ├── pages/         # Asosiy sahifalar
│   ├── redux/         # State management
│   ├── services/      # API integratsiya
│   ├── utils/         # Yordamchi funksiyalar
│   └── App.js         # Asosiy komponent
└── package.json
```

### Build va Deploy

```bash
# Build
cd admin
npm run build

# Test
serve -s build

# Deploy (production server)
scp -r build/* user@server:/var/www/nerobot/admin/
```

## 🔒 Xavfsizlik

- JWT based authentication
- API rate limiting
- CORS protection
- MongoDB indexes
- Input validation
- XSS prevention

## 🤝 Yordam

Savollar yoki muammolar uchun:

- Telegram: @${process.env.SUPPORT_USERNAME}
- GitHub Issues

## 📄 Litsenziya

ISC

---

**Ishlab chiqilgan:** 2024
