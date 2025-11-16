const { Scenes } = require("telegraf");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const {
  contactKeyboard,
  regionKeyboard,
  skipCityKeyboard,
  mainMenuKeyboard,
  cancelKeyboard,
} = require("../keyboards/keyboards");
const {
  CODE_VERIFIED,
  CODE_NOT_FOUND,
  CODE_ALREADY_USED,
} = require("../utils/messages");

const registrationScene = new Scenes.WizardScene(
  "registration",
  // Step 1: Ismni so'rash
  async (ctx) => {
    await ctx.reply("👤 Iltimos, ismingizni kiriting:", cancelKeyboard());
    return ctx.wizard.next();
  },
  // Step 2: Olish ismini va so'rash telefon raqamini
  async (ctx) => {
    try {
      if (ctx.message?.text === "❌ Bekor qilish") {
        await ctx.scene.leave();
        return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
      }

      if (!ctx.message?.text) {
        return await ctx.reply(
          "Iltimos, ismingizni matn ko'rinishida kiriting:"
        );
      }

      ctx.wizard.state.name = ctx.message.text;
      await ctx.reply(
        "📱 Iltimos, telefon raqamingizni yuboring:",
        contactKeyboard()
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error("Ism qayd qilishda xatolik:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },
  // Step 3: Olish telefon raqamini va so'rash viloyatni
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
    }

    let phone = null;

    if (ctx.message?.contact) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.message?.text) {
      phone = ctx.message.text;
    }

    if (!phone) {
      return await ctx.reply(
        'Iltimos, telefon raqamingizni yuboring yoki "Kontaktni yuborish" tugmasini bosing:',
        contactKeyboard()
      );
    }

    ctx.wizard.state.phone = phone;
    await ctx.reply("🗺 Viloyatingizni tanlang:", regionKeyboard());
    return ctx.wizard.next();
  },
  // Step 4: Olish viloyatni va so'rash shaharni
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
    }

    const { REGIONS } = require("../utils/regions");
    if (!REGIONS.includes(ctx.message?.text)) {
      return await ctx.reply(
        "❌ Iltimos, viloyatni tugmalardan tanlang:",
        regionKeyboard()
      );
    }

    ctx.wizard.state.region = ctx.message.text;
    await ctx.reply(
      "� Shahar/tumaningizni kiriting yoki o'tkazib yuboring:",
      skipCityKeyboard()
    );
    return ctx.wizard.next();
  },
  // Step 5: Olish shaharni va so'rash promo kodni
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
    }

    let city = null;
    if (ctx.message?.text && ctx.message.text !== "⏭ O'tkazib yuborish") {
      city = ctx.message.text;
    }

    ctx.wizard.state.city = city;
    await ctx.reply("🎟 Iltimos, chekdagi kodni kiriting:", cancelKeyboard());
    return ctx.wizard.next();
  },
  // Step 6: Tekshirish promo kodni
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
    }

    if (!ctx.message?.text) {
      return await ctx.reply("Iltimos, kodni kiriting:");
    }

    const code = ctx.message.text.trim().toUpperCase();

    try {
      // Avval tekshirish: user allaqachon ro'yxatdan o'tganmi?
      const existingUser = await User.findOne({ telegramId: ctx.from.id });

      if (existingUser) {
        await ctx.reply(
          "✅ Siz allaqachon ro'yxatdan o'tgansiz!\n\n" +
            `📝 Ism: ${existingUser.name}\n` +
            `📱 Telefon: ${existingUser.phone}\n` +
            `🗺 Viloyat: ${existingUser.region}\n` +
            `🎟 Promo kod: ${existingUser.usedPromoCode}\n\n` +
            "Profil ma'lumotlaringizni ko'rish uchun 👤 Profilim tugmasini bosing.",
          mainMenuKeyboard()
        );
        return await ctx.scene.leave();
      }

      // Qidirish kodni ma'lumotlar bazasida
      const promoCode = await PromoCode.findOne({ code: code });

      if (!promoCode) {
        await ctx.reply(CODE_NOT_FOUND, mainMenuKeyboard());
        return await ctx.scene.leave();
      }

      if (promoCode.isUsed) {
        // Takroriy kod - kim ishlatgan ko'rsatish
        const usedUser = await User.findOne({ telegramId: promoCode.usedBy });
        const userName = usedUser ? usedUser.name : "Noma'lum";
        const userPhone = usedUser ? usedUser.phone : "Noma'lum";

        await ctx.reply(
          CODE_ALREADY_USED(userName, userPhone),
          mainMenuKeyboard()
        );
        return await ctx.scene.leave();
      }

      // Saqlash foydalanuvchi ma'lumotlarini
      const userData = {
        telegramId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        name: ctx.wizard.state.name,
        phone: ctx.wizard.state.phone,
        region: ctx.wizard.state.region,
        city: ctx.wizard.state.city,
        usedPromoCode: code,
      };

      // Yangilash yoki yaratish foydalanuvchini
      const user = await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        userData,
        { upsert: true, new: true }
      );

      // Belgilash kodni ishlatilgan
      promoCode.isUsed = true;
      promoCode.usedBy = ctx.from.id;
      promoCode.usedByName = ctx.wizard.state.name;
      promoCode.usedByPhone = ctx.wizard.state.phone;
      promoCode.usedAt = new Date();
      await promoCode.save();

      // Adminlar guruhiga xabar yuborish
      const adminNotification = `
🎯 *Yangi Promo Kod Ishlatildi!*

👤 *Foydalanuvchi ma'lumotlari:*
- Ism: ${user.name}
- Tel: ${user.phone}
- Viloyat: ${user.region}
${user.city ? `- Shahar: ${user.city}` : ""}
- Username: ${user.username ? "@" + user.username : "Mavjud emas"}
- Telegram ID: \`${user.telegramId}\`

🎟 *Promo Kod:* \`${code}\`
⏰ Vaqt: ${new Date().toLocaleString("uz-UZ")}
      `;

      try {
        await ctx.telegram.sendMessage(
          process.env.ADMIN_GROUP_ID,
          adminNotification,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Adminlar guruhiga xabar yuborishda xatolik:", error);
      }

      await ctx.reply(CODE_VERIFIED, mainMenuKeyboard());
      return await ctx.scene.leave();
    } catch (error) {
      console.error("Xatolik promo kod tekshirishda:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  }
);

module.exports = registrationScene;
