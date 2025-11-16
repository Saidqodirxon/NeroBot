const WELCOME_MESSAGE = `
🎉 *Xush kelibsiz Nero Bonus botiga!*

Bu bot orqali siz chekdagi promo kodni tekshirishingiz va ro'yxatdan o'tishingiz mumkin.

📋 *Qanday ishlaydi?*
1️⃣ Ma'lumotlaringizni kiriting (ism, telefon, viloyat)
2️⃣ Chekdagi promo kodni yuboring
3️⃣ Kod tasdiqlanadi va siz ro'yxatga olinasiz

🎯 Boshlash uchun *"📝 Promokodni kiritish"* tugmasini bosing.
`;

const HELP_MESSAGE = `
🤖 *Bot buyruqlari va yordam*

📝 *Asosiy funksiyalar:*

🔹 *Promo kod kiritish:*
"📝 Promokodni kiritish" tugmasini bosing va ko'rsatmalarga rioya qiling.

🔹 *Profil:*
"👤 Profilim" tugmasida ma'lumotlaringizni ko'rishingiz va tahrirlashingiz mumkin.

🔹 *Qo'llab-quvvatlash:*
"🛠 Qo'llab-quvvatlash" tugmasini bosing yoki @${
  process.env.SUPPORT_USERNAME || "admin"
} ga murojaat qiling.

⚠️ *Muhim eslatmalar:*
- Har bir promo kod faqat bir marta ishlatilishi mumkin
- Har bir foydalanuvchi faqat bitta kod bilan ro'yxatdan o'tishi mumkin
- Kod ishlatilgandan keyin qaytarib bo'lmaydi

💡 *Savollar bo'lsa:*
/help - Bu xabarni qayta ko'rish
/start - Botni qayta ishga tushirish
`;

const SUPPORT_MESSAGE = `
🛠 *Texnik yordam*

Agar sizda savollar yoki muammolar bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling:

👤 Telegram: @${process.env.SUPPORT_USERNAME || "admin"}

Tez orada sizga javob beramiz!
`;

const CODE_VERIFIED = `
✅ *Tabriklaymiz!*

Ma'lumotlaringiz muvaffaqiyatli ro'yxatga olindi.
Adminlar sizning ma'lumotlaringizni ko'rib chiqishadi.
`;

const CODE_NOT_FOUND = `
❌ *Bunday kod topilmadi*

Iltimos, kiritgan ma'lumotlaringizni tekshiring va qaytadan urinib ko'ring.
`;

const CODE_ALREADY_USED = (userName, userPhone) => `
⚠️ *Ushbu kod allaqachon ishlatilgan*

📋 Kod ishlatgan foydalanuvchi:
👤 Ism: ${userName}
📱 Telefon: ${userPhone}

Agar bu xato deb hisoblasangiz, texnik yordam bilan bog'laning: @${
  process.env.SUPPORT_USERNAME || "admin"
}
`;

module.exports = {
  WELCOME_MESSAGE,
  HELP_MESSAGE,
  SUPPORT_MESSAGE,
  CODE_VERIFIED,
  CODE_NOT_FOUND,
  CODE_ALREADY_USED,
};
