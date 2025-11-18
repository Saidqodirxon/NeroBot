# NeroBot - Yangi Xususiyatlar

## O'zgarishlar

### 1. Mavsum (Season) Tizimi ✅

- Har bir promo kod mavsumga bog'langan
- Admin panelda mavsum yaratish, tahrirlash, o'chirish
- Mavsum bo'yicha filtrlash va statistika
- Bir mavsumni o'chirish - barcha kodlar va foydalanish tarixi ham o'chadi

### 2. Foydalanuvchi Ro'yxatdan O'tishi ✅

- **Muhim**: Foydalanuvchi kod kiritmasa ham ma'lumotlari saqlanadi
- Ism, telefon, viloyat yig'ilgandan keyin darhol bazaga yoziladi
- Keyin promo kod kiritish so'raladi (majburiy emas)

### 3. Kod Ko'rinishi ✅

- **User o'z kodlarini ko'rganda**: To'liq kod ko'rinadi (maskirovka yo'q)
- **Admin xabarlarda**: To'liq ma'lumotlar (ism, telefon, kod)
- **Boshqa foydalanuvchilar uchun**: Maskirovkalangan (AA1\*\*\*)

### 4. Yangilangan Xabarlar ✅

Barcha bot xabarlari kompaniya brending bilan yangilandi:

```
👋 [Kompaniya nomi] rasmiy botiga xush kelibsiz!
Biz promo-kodlarni tekshirib, sovrinli o'yinlar va bonus dasturlarida
ishtirok etishingiz uchun ro'yxatdan o'tkazamiz.

🎁 Kod yuboring — NeuroBot uni qabul qiladi va sizni o'yinga qo'shadi.
Qancha ko'p kod, shuncha katta imkoniyat! 🚀🔥
```

### 5. Admin Panel API ✅

#### Mavsum CRUD

- `GET /api/v1/seasons` - Barcha mavsumlar
- `POST /api/v1/seasons` - Yangi mavsum yaratish
- `PUT /api/v1/seasons/:id` - Mavsumni yangilash
- `DELETE /api/v1/seasons/:id` - Mavsum va barcha ma'lumotlarni o'chirish

#### Kod Qo'shish (seasonId bilan)

```json
POST /api/v1/promo-codes
{
  "codes": ["AA1234", "AA1235"],
  "seasonId": "507f1f77bcf86cd799439011",
  "description": "Yangi mavsum kodlari"
}
```

#### Filtrlangan Statistika

```
GET /api/v1/stats?seasonId=507f1f77bcf86cd799439011
```

Qaytaradi:

- Jami kodlar (mavsum bo'yicha)
- Ishlatilgan/Ishlatilmagan
- Viloyat bo'yicha foydalanuvchilar
- Top 10 foydalanuvchilar (mavsum bo'yicha)
- Har mavsum uchun statistika

#### Foydalanuvchi Tafsilotlari

```
GET /api/v1/users/:telegramId?seasonId=507f1f77bcf86cd799439011
```

Qaytaradi:

- Foydalanuvchi ma'lumotlari
- Kiritgan kodlar tarixi (mavsum filtri bilan)
- Jami kodlar soni

#### Export

- `GET /api/v1/export/codes?seasonId=xxx` - Kodlarni yuklab olish
- `GET /api/v1/export/users` - Foydalanuvchilarni yuklab olish
- `GET /api/v1/export/user/:telegramId?seasonId=xxx` - Bitta foydalanuvchi tarixi

### 6. Xatolik Bartaraf Etish ✅

- Profil yuklashda try-catch qo'shildi
- Bot qotib qolish muammosi hal qilindi
- Barcha database so'rovlarda xatolik ushlash

### 7. Button Label O'zgarishlari ✅

- "📝 Promokodni kiritish" → "📝 Kod yuborish"
- "🔙 Asosiy menyu" → "🏠 Asosiy menyu"

## O'rnatish

### 1. Migrations

Eski ma'lumotlarni yangi tizimga ko'chirish:

```bash
node src/scripts/setupSeasons.js
```

Bu script:

- Default mavsum yaratadi (agar yo'q bo'lsa)
- Barcha eski kodlarni default mavsumga bog'laydi
- Barcha eski usage recordlarni default mavsumga bog'laydi

### 2. Fayllarni Almashtirish

**Yangi fayllar:**

- `src/models/Season.js` - Yangi model
- `src/scenes/registrationNew.js` - Yangilangan registration
- `src/api/routesNew.js` - Yangilangan API
- `src/scripts/setupSeasons.js` - Migration script

**O'zgartirilgan fayllar:**

- `src/models/User.js` - name, phone, region optional
- `src/models/PromoCode.js` - seasonId qo'shildi
- `src/models/PromoCodeUsage.js` - seasonId qo'shildi
- `src/utils/messages.js` - Yangi matnlar
- `src/keyboards/keyboards.js` - Button labellar
- `src/scenes/viewPromoCodes.js` - Kod maskirovka o'chirildi
- `src/nerobot.js` - Yangi importlar va error handling

### 3. Botni Ishga Tushirish

```bash
# Development
npm run dev

# Production
npm start
```

## Yangi Admin Panel Workflow

1. **Mavsum yaratish**

   - Admin panel → Seasons → Create New
   - Name: "Yangi Yil 2025"
   - Start Date: 2025-01-01
   - Active: true

2. **Kod qo'shish**

   - Admin panel → Promo Codes → Add Codes
   - Season: "Yangi Yil 2025" ni tanlash
   - Codes: AA1001, AA1002, ... (list)
   - Description: "Yangi yil aksiyasi"

3. **Statistika ko'rish**

   - Admin panel → Statistics
   - Season filter: "Yangi Yil 2025"
   - Ko'rinadi: jami/ishlatilgan kodlar, top users

4. **Mavsumni o'chirish**

   - Admin panel → Seasons → Delete
   - Tasdiqlash kerak
   - **Ogohlantirish**: Barcha bog'liq ma'lumotlar o'chadi!

5. **Foydalanuvchi tarixi**
   - Admin panel → Users → View Details
   - Season filter bilan kodlarni ko'rish
   - Export qilish mumkin

## Test Qilish

1. Ro'yxatdan o'tish (kodsiz):

   - Bot → /start
   - Ism, telefon, viloyat kiriting
   - ✅ User bazaga yoziladi
   - Kod so'raladi (agar yopilsa - ma'lumotlar saqlanadi)

2. Kod kiritish:

   - "📝 Kod yuborish" bosing
   - Kod kiriting
   - ✅ User'ga to'liq kod ko'rinadi

3. Profil ko'rish:

   - "👤 Profilim" → "🎟 Barcha kodlarimni ko'rish"
   - ✅ To'liq kodlar ko'rinadi (maskirovka yo'q)

4. Admin xabarlari:
   - User kod kiritganda admin grupaga xabar keladi
   - ✅ To'liq ma'lumotlar: ism, telefon, kod, mavsum

## Muhim Eslatmalar

⚠️ **Mavsum o'chirish**: Mavsum o'chirilsa, unga tegishli BARCHA promo kodlar va usage recordlar ham o'chadi. Bu qaytarilmaydi!

✅ **Default Statistics**: Admin panel ochilganda darhol statistika yuklaydi (eng oxirgi aktiv mavsum)

✅ **User Data**: Foydalanuvchi kod kirmasa ham bazada saqlanadi

✅ **Code Visibility**: User o'z kodlarini to'liq ko'radi, admin ham to'liq ko'radi

## Qo'shimcha

Migration script'ni istalgan vaqt qayta ishlatish mumkin - u faqat seasonId yo'q recordlarni yangilaydi.

Savol yoki muammo bo'lsa:

- Loglarni tekshiring: `console.log` va `console.error`
- Database'ni tekshiring: MongoDB Compass yoki CLI
- Migration script'ni qayta ishga tushiring
