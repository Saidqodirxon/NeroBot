const { Scenes } = require("telegraf");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const {
  contactKeyboard,
  regionKeyboard,
  mainMenuKeyboard,
  cancelKeyboard,
} = require("../keyboards/keyboards");

const registrationScene = new Scenes.WizardScene(
  "registration",
  // Step 1: User tekshirish - agar mavjud bo'lsa to'g'ridan-to'g'ri kod so'rash
  async (ctx) => {
    const existingUser = await User.findOne({ telegramId: ctx.from.id });

    if (existingUser) {
      // User allaqachon ro'yxatdan o'tgan - faqat kod so'rash
      ctx.wizard.state.existingUser = existingUser;
      await ctx.reply("🎟 *Promo kodni kiriting*\n\nChekdagi kodni kiriting:", {
        parse_mode: "Markdown",
        ...cancelKeyboard(),
      });
      // To'g'ridan-to'g'ri Step 5'ga o'tish (selectStep(4) = Step 5, 0-indexed)
      return ctx.wizard.selectStep(4);
    }

    // Yangi user - ismni so'rash
    await ctx.reply(
      "👤 *Ro'yxatdan o'tish*\n\nIltimos, to'liq ismingizni kiriting:",
      {
        parse_mode: "Markdown",
        ...cancelKeyboard(),
      }
    );
    return ctx.wizard.next();
  },
  // Step 2: Ismni olish va telefon so'rash
  async (ctx) => {
    try {
      if (ctx.message?.text === "❌ Bekor qilish") {
        await ctx.scene.leave();
        return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
      }

      if (!ctx.message?.text || ctx.message.text.trim().length < 3) {
        return await ctx.reply(
          "❌ Iltimos, kamida 3 harfdan iborat to'liq ismingizni kiriting:",
          cancelKeyboard()
        );
      }

      ctx.wizard.state.name = ctx.message.text.trim();
      await ctx.reply(
        "📱 *Telefon raqamingizni yuboring*\n\n Pastdagi tugmani bosing:",
        {
          parse_mode: "Markdown",
          ...contactKeyboard(),
        }
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
  // Step 3: Telefon olish va viloyat so'rash
  async (ctx) => {
    try {
      if (ctx.message?.text === "❌ Bekor qilish") {
        await ctx.scene.leave();
        return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
      }

      let phone = null;

      if (ctx.message?.contact) {
        phone = ctx.message.contact.phone_number;
      } else if (ctx.message?.text) {
        phone = ctx.message.text.trim();
      }

      if (!phone) {
        return await ctx.reply(
          '❌ Iltimos, telefon raqamingizni yuboring yoki "📱 Kontaktni yuborish" tugmasini bosing:',
          contactKeyboard()
        );
      }

      ctx.wizard.state.phone = phone;
      await ctx.reply(
        "🗺 *Viloyatingizni tanlang:*\n\nQuyidagi ro'yxatdan o'z viloyatingizni tanlang:",
        {
          parse_mode: "Markdown",
          ...regionKeyboard(),
        }
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error("Telefon qayd qilishda xatolik:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },
  // Step 4: Viloyat olish va promo kod so'rash
  async (ctx) => {
    try {
      if (ctx.message?.text === "❌ Bekor qilish") {
        await ctx.scene.leave();
        return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
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
        "🎟 *Promo kodni kiriting*\n\nChekdagi 6 xonali kodni kiriting:",
        {
          parse_mode: "Markdown",
          ...cancelKeyboard(),
        }
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error("Viloyat qayd qilishda xatolik:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },
  // Step 5: Promo kodni tekshirish
  async (ctx) => {
    try {
      if (ctx.message?.text === "❌ Bekor qilish") {
        await ctx.scene.leave();
        return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
      }

      if (!ctx.message?.text) {
        return await ctx.reply(
          "❌ Iltimos, promo kodni kiriting:",
          cancelKeyboard()
        );
      }

      const code = ctx.message.text.trim().toUpperCase();
      console.log("🔍 Kod kiritildi:", code);

      // Promo kodni maskirovka qilish funksiyasi (faqat birinchi 3 harfni ko'rsatish)
      const maskPromoCode = (code) => {
        if (!code || code.length < 4) return code;
        return code.slice(0, 3) + "*".repeat(code.length - 3);
      };

      // Telefon raqamini maskirovka qilish funksiyasi (userlar uchun)
      const maskPhoneForUser = (phone) => {
        if (!phone || phone.length < 4) return "*****";
        const visibleEnd = phone.slice(-4);
        return "*".repeat(phone.length - 4) + visibleEnd;
      };

      // Telefon raqamini maskirovka qilish funksiyasi (admin uchun - oxirgi 4 yashirin)
      const maskPhoneForAdmin = (phone) => {
        if (!phone || phone.length < 4) return phone || "Noma'lum";
        const visibleStart = phone.slice(0, -4);
        return visibleStart + "****";
      };

      // Telegram markdown maxsus belgilarini escape qilish
      const escapeMarkdown = (text) => {
        if (!text) return "";
        return text.toString().replace(/[_*\[\]()~>#+\-=|{}.!']/g, "\\$&");
      };

      // 1. User mavjudligini tekshirish
      let user =
        ctx.wizard.state.existingUser ||
        (await User.findOne({ telegramId: ctx.from.id }));

      if (!user) {
        // Birinchi marta - user yaratish
        console.log("✨ Yangi user yaratilmoqda...");
        user = await User.create({
          telegramId: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          name: ctx.wizard.state.name,
          phone: ctx.wizard.state.phone,
          region: ctx.wizard.state.region,
          usedPromoCode: code, // Birinchi kod
        });
        console.log("✅ User yaratildi:", user.telegramId);
      } else {
        console.log("👤 Mavjud user:", user.name);

        // Account change detection - username yoki first_name o'zgarganmi?
        const usernameChanged = user.username !== ctx.from.username;
        const firstNameChanged = user.firstName !== ctx.from.first_name;

        if (usernameChanged || firstNameChanged) {
          console.log("⚠️ Account ma'lumotlari o'zgardi!");

          // Adminlarga xabar - hisob o'zgarishi
          try {
            const changeNotification = `
⚠️ *Hisob o'zgarishi aniqlandi!*

🆔 *Telegram ID:* \`${ctx.from.id}\`

🔄 *O'zgarishlar:*
${
  usernameChanged
    ? `✈️ Username: ${user.username || "yo'q"} → ${ctx.from.username || "yo'q"}`
    : ""
}
${
  firstNameChanged
    ? `👤 Ism: ${user.firstName || "yo'q"} → ${ctx.from.first_name || "yo'q"}`
    : ""
}

📱 *Profildagi telefon:* ${user.phone}
🗺 *Viloyat:* ${user.region}
🎟 *Yangi kiritilgan kod:* \`${code}\`

⏰ *Vaqt:* ${new Date().toLocaleString("uz-UZ")}

⚠️ *Bu Telegram hisob oldin ro'yxatdan o'tgan, lekin username yoki ism o'zgartirilgan!*
            `;

            await ctx.telegram.sendMessage(
              process.env.ADMIN_GROUP_ID,
              changeNotification,
              { parse_mode: "Markdown" }
            );
          } catch (error) {
            console.error("Admin notification error:", error);
          }

          // User ma'lumotlarini yangilash (faqat Telegram ma'lumotlari)
          user.username = ctx.from.username;
          user.firstName = ctx.from.first_name;
          user.lastName = ctx.from.last_name;
          await user.save();
        }
      }

      // 2. User bu kodni allaqachon ishlatganmi?
      const alreadyUsed = await PromoCodeUsage.findOne({
        telegramId: ctx.from.id,
        promoCode: code,
      });
      console.log("🔍 User bu kodni ishlatganmi?", alreadyUsed ? "HA" : "YO'Q");

      if (alreadyUsed) {
        await ctx.reply(
          "⚠️ *Siz bu kodni allaqachon ishlatgansiz!*\n\n" +
            `🎟 Kod: \`${maskPromoCode(code)}\`\n` +
            `📅 Ishlatilgan sana: ${new Date(alreadyUsed.usedAt).toLocaleString(
              "uz-UZ"
            )}\n\n` +
            "Boshqa kod kiritish uchun 📝 *Promokodni kiritish* tugmasini bosing.",
          {
            parse_mode: "Markdown",
            ...mainMenuKeyboard(),
          }
        );

        // Adminlarga xabar - o'z kodini qayta kiritish urinishi
        try {
          await ctx.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
            `⚠️ *O'z kodini qayta kiritish urinishi\\!*\n\n` +
              `👤 Ism: ${escapeMarkdown(user.name)}\n` +
              `📱 Telefon: ${escapeMarkdown(user.phone)}\n` +
              `🗺 Viloyat: ${escapeMarkdown(user.region)}\n` +
              `✈️ Username: ${
                ctx.from.username
                  ? "@" + escapeMarkdown(ctx.from.username)
                  : "Mavjud emas"
              }\n` +
              "🆔 Telegram ID: `" +
              ctx.from.id +
              "`\n\n" +
              "🎟 *Kiritilgan kod:* `" +
              escapeMarkdown(code) +
              "`\n" +
              `📅 *Birinchi ishlatilgan:* ${escapeMarkdown(
                new Date(alreadyUsed.usedAt).toLocaleString("uz-UZ")
              )}\n` +
              `⏰ *Hozirgi vaqt:* ${escapeMarkdown(
                new Date().toLocaleString("uz-UZ")
              )}`,
            { parse_mode: "MarkdownV2" }
          );
        } catch (err) {
          console.error("Admin notification error:", err);
        }

        return await ctx.scene.leave();
      }

      // 3. Kodni bazada topish
      const promoCode = await PromoCode.findOne({ code: code });
      console.log("🔍 Kod bazada:", promoCode ? "TOPILDI" : "TOPILMADI");

      if (!promoCode) {
        await ctx.reply(
          "❌ *Kod topilmadi!*\n\n" +
            "Bunday promo kod mavjud emas.\n" +
            "Iltimos, kodni to'g'ri kiritganingizni tekshiring.",
          {
            parse_mode: "Markdown",
            ...mainMenuKeyboard(),
          }
        );

        // Adminlarga xabar - topilmagan kod kiritildi
        try {
          await ctx.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
            `⚠️ *Topilmagan kod kiritildi\\!*\n\n` +
              `👤 User: ${escapeMarkdown(user.name)}\n` +
              `📱 Telefon: ${escapeMarkdown(user.phone)}\n` +
              "🎟 Kod: `" +
              escapeMarkdown(code) +
              "`\n" +
              `⏰ Vaqt: ${escapeMarkdown(new Date().toLocaleString("uz-UZ"))}`,
            { parse_mode: "MarkdownV2" }
          );
        } catch (err) {
          console.error("Admin notification error:", err);
        }

        return await ctx.scene.leave();
      }

      // 4. Kod ishlatilganmi?
      console.log("🔍 Kod ishlatilganmi?", promoCode.isUsed ? "HA" : "YO'Q");

      if (promoCode.isUsed) {
        const usedByUsage = await PromoCodeUsage.findOne({
          promoCode: code,
        });

        // User uchun maskirovka
        const maskedPhoneForUser = maskPhoneForUser(
          usedByUsage?.userPhone || ""
        );
        const maskedCodeForUser = maskPromoCode(code);
        const maskedNameForUser = usedByUsage?.userName
          ? usedByUsage.userName.slice(0, 3) + "***"
          : "***";

        await ctx.reply(
          "⚠️ *Bu kod allaqachon ishlatilgan!*\n\n" +
            `Bu ${maskedCodeForUser} kodni boshqa foydalanuvchi ishlatgan:\n` +
            `👤 Ism: ${maskedNameForUser}\n` +
            `📱 Telefon: ${maskedPhoneForUser}\n\n` +
            "Har bir kod faqat *bir marta* ishlatilishi mumkin.\n\n" +
            "Yordam uchun: 🛠 *Qo'llab-quvvatlash* tugmasini bosing.",
          {
            parse_mode: "Markdown",
            ...mainMenuKeyboard(),
          }
        );

        // Adminlarga xabar - to'liq ma'lumotlar
        try {
          const adminMsg =
            `⚠️ *Ishlatilgan kodni kiritish urinishi\\!*\n\n` +
            `🚫 *Urinish ma\\'lumotlari:*\n` +
            `👤 Ism: ${escapeMarkdown(user.name)}\n` +
            `📱 Telefon: ${escapeMarkdown(user.phone)}\n` +
            `🗺 Viloyat: ${escapeMarkdown(user.region)}\n` +
            `✈️ Username: ${
              ctx.from.username
                ? "@" + escapeMarkdown(ctx.from.username)
                : "Mavjud emas"
            }\n` +
            "🆔 Telegram ID: `" +
            ctx.from.id +
            "`\n\n" +
            "🎟 *Kiritilgan kod:* `" +
            escapeMarkdown(code) +
            "`\n\n" +
            `👥 *Kodni ishlatgan foydalanuvchi:*\n` +
            `📝 Ism: ${escapeMarkdown(usedByUsage?.userName || "Noma'lum")}\n` +
            `📱 Telefon: ${escapeMarkdown(
              usedByUsage?.userPhone || "Noma'lum"
            )}\n\n` +
            `⏰ *Vaqt:* ${escapeMarkdown(new Date().toLocaleString("uz-UZ"))}`;

          await ctx.telegram.sendMessage(process.env.ADMIN_GROUP_ID, adminMsg, {
            parse_mode: "MarkdownV2",
          });
        } catch (error) {
          console.error("Admin notification error:", error);
          console.error("Failed message:", error.on?.payload?.text);
        }

        return await ctx.scene.leave();
      }

      // 5. Kod ishlatilmagan - ishlatish
      console.log("✅ Kod ishlatilmagan - qabul qilinmoqda...");

      // PromoCode'ni ishlatilgan deb belgilash
      promoCode.isUsed = true;
      promoCode.usedBy = ctx.from.id;
      promoCode.usedByName = user.name;
      promoCode.usedByPhone = user.phone;
      promoCode.usedAt = new Date();
      await promoCode.save();

      // PromoCodeUsage yaratish
      await PromoCodeUsage.create({
        telegramId: ctx.from.id,
        userName: user.name,
        userPhone: user.phone,
        userRegion: user.region,
        username: ctx.from.username,
        promoCode: code,
      });

      // Userning usedPromoCode'ini yangilash (eng oxirgi kod)
      user.usedPromoCode = code;
      await user.save();

      // User'ga muvaffaqiyat xabari
      const usageCount = await PromoCodeUsage.countDocuments({
        telegramId: ctx.from.id,
      });

      await ctx.reply(
        "✅ *Tabriklaymiz!*\n\n" +
          "Promo kod muvaffaqiyatli ro'yxatga olindi!\n\n" +
          `📝 Ism: ${user.name}\n` +
          `📱 Telefon: ${user.phone}\n` +
          `🗺 Viloyat: ${user.region}\n` +
          `🎟 Promo kod: \`${code}\`\n` +
          `📊 Jami ishlatilgan kodlar: ${usageCount}\n\n` +
          "Yana kod kiritish uchun 📝 *Promokodni kiritish* tugmasini bosing.\n" +
          "Profilingizni ko'rish uchun 👤 *Profilim* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );

      // Adminlarga xabar
      try {
        await ctx.telegram.sendMessage(
          process.env.ADMIN_GROUP_ID,
          `🎉 *Yangi promo kod ishlatildi\\!*\n\n` +
            `👤 *Foydalanuvchi:*\n` +
            `📝 Ism: ${escapeMarkdown(user.name)}\n` +
            `📱 Telefon: ${escapeMarkdown(user.phone)}\n` +
            `🗺 Viloyat: ${escapeMarkdown(user.region)}\n` +
            `✈️ Username: ${
              user.username
                ? "@" + escapeMarkdown(user.username)
                : "Mavjud emas"
            }\n` +
            "🆔 Telegram ID: `" +
            user.telegramId +
            "`\n\n" +
            "🎟 *Promo kod:* `" +
            escapeMarkdown(code) +
            "`\n" +
            `📊 *Bu userning ${usageCount}\\-kod*\n` +
            `⏰ *Vaqt:* ${escapeMarkdown(new Date().toLocaleString("uz-UZ"))}`,
          { parse_mode: "MarkdownV2" }
        );
      } catch (error) {
        console.error("Admin notification error:", error);
      }

      return await ctx.scene.leave();
    } catch (error) {
      console.error("Promo kod tekshirishda xatolik:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  }
);

module.exports = registrationScene;
