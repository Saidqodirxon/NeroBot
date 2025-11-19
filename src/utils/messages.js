const WELCOME_MESSAGE = `
👋 *Nero rasmiy botiga xush kelibsiz!*

Biz promo-kodlarni tekshirib, sovrinli o'yinlar va bonus dasturlarida ishtirok etishingiz uchun ro'yxatdan o'tkazamiz.

🎁 Kod yuboring — NeuroBot uni qabul qiladi va sizni o'yinga qo'shadi. Qancha ko'p kod, shuncha katta imkoniyat! 🚀🔥
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
🛠 <b>Texnik yordam</b>

Agar sizda savollar yoki muammolar bo'lsa, qo'llab-quvvatlash xizmatiga murojaat qiling:

👤 Telegram: @${process.env.SUPPORT_USERNAME || "admin"}

Tez orada sizga javob beramiz!
`;

const CODE_VERIFIED = (name, code, phone) => `
🎉 *Rahmat, ${name}!*

Promo-kodingiz \`${code}\` sizning ${phone} raqamingizga ro'yxatdan o'tkazildi. Siz o'yinda ishtirok etmoqdasiz. Omad tilaymiz! ✨
`;

const CODE_NOT_FOUND = (code) => `
❌ *${code} kodi topilmadi.*

To'g'riligini tekshirib, yana yuboring.
`;

const CODE_ALREADY_USED = (code) => `
⚠️ *${code} kodi boshqa foydalanuvchi tomonidan allaqachon ishlatilgan.*

Batafsil ma'lumot uchun qo'llab-quvvatlash xizmatiga yozing.
`;

const REGISTRATION_SUCCESS = (name) => `
✅ *${name}, siz muvaffaqiyatli ro'yxatdan o'tdingiz!*

Endi promo-kodlaringizni yuborishingiz mumkin — «Kod yuborish» tugmasini bosing yoki kodni shu yerga yozib yuboring. Omad! 🍀
`;

const PROMO_CODE_PROMPT = `
🔢 *Promo-kodingizni yuboring.*

Misol: ABC12345
`;

module.exports = {
  WELCOME_MESSAGE,
  HELP_MESSAGE,
  SUPPORT_MESSAGE,
  CODE_VERIFIED,
  CODE_NOT_FOUND,
  CODE_ALREADY_USED,
  REGISTRATION_SUCCESS,
  PROMO_CODE_PROMPT,
};
