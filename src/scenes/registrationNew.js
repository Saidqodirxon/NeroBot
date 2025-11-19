const { Scenes } = require("telegraf");
const User = require("../models/User");
const PromoCode = require("../models/PromoCode");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const Season = require("../models/Season");
const {
  contactKeyboard,
  regionKeyboard,
  mainMenuKeyboard,
  cancelKeyboard,
} = require("../keyboards/keyboards");
const {
  REGISTRATION_SUCCESS,
  PROMO_CODE_PROMPT,
  CODE_VERIFIED,
  CODE_NOT_FOUND,
  CODE_ALREADY_USED,
} = require("../utils/messages");

// Telegram MarkdownV2 escaping
const escapeMarkdown = (text) => {
  if (!text) return "";
  return text.toString().replace(/[_*\[\]()~>#+\-=|{}.!']/g, "\\$&");
};

const registrationScene = new Scenes.WizardScene(
  "registration",
  // Step 1: Check if user exists
  async (ctx) => {
    try {
      const existingUser = await User.findOne({ telegramId: ctx.from.id });

      if (existingUser) {
        // User exists - go directly to promo code entry
        ctx.wizard.state.existingUser = existingUser;
        await ctx.reply(PROMO_CODE_PROMPT, {
          parse_mode: "Markdown",
          ...cancelKeyboard(),
        });
        return ctx.wizard.selectStep(4); // Jump to Step 5 (promo code validation)
      }

      // New user - ask for name
      await ctx.reply(
        "👤 *Ro'yxatdan o'tish*\n\nIltimos, to'liq ismingizni kiriting:",
        {
          parse_mode: "Markdown",
          ...cancelKeyboard(),
        }
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error("Registration start error:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },

  // Step 2: Collect name
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
        "📱 *Telefon raqamingizni yuboring*\n\nPastdagi tugmani bosing:",
        {
          parse_mode: "Markdown",
          ...contactKeyboard(),
        }
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error("Name collection error:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },

  // Step 3: Collect phone
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
      console.error("Phone collection error:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },

  // Step 4: Collect region and save user (NEW: save user immediately)
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

      // Save user to database BEFORE asking for promo code
      const newUser = await User.create({
        telegramId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        name: ctx.wizard.state.name,
        phone: ctx.wizard.state.phone,
        region: ctx.wizard.state.region,
      });

      console.log("✅ User saved:", newUser.telegramId);

      // Send success message with user's name
      await ctx.reply(REGISTRATION_SUCCESS(ctx.wizard.state.name), {
        parse_mode: "Markdown",
      });

      // Now ask for promo code
      await ctx.reply(PROMO_CODE_PROMPT, {
        parse_mode: "Markdown",
        ...cancelKeyboard(),
      });

      ctx.wizard.state.existingUser = newUser;
      return ctx.wizard.next();
    } catch (error) {
      console.error("Region & user save error:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  },

  // Step 5: Validate promo code
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
      console.log("🔍 Code entered:", code);

      // Get user (either from wizard state or database)
      let user =
        ctx.wizard.state.existingUser ||
        (await User.findOne({ telegramId: ctx.from.id }));

      if (!user) {
        await ctx.reply(
          "❌ Foydalanuvchi topilmadi. Iltimos, qaytadan ro'yxatdan o'ting.",
          mainMenuKeyboard()
        );
        return await ctx.scene.leave();
      }

      // Check if user already used this code
      const alreadyUsed = await PromoCodeUsage.findOne({
        telegramId: ctx.from.id,
        promoCode: code,
      });

      if (alreadyUsed) {
        await ctx.reply(
          "⚠️ *Siz bu kodni allaqachon ishlatgansiz!*\n\n" +
            `🎟 Kod: \`${code}\`\n` +
            `📅 Ishlatilgan sana: ${new Date(alreadyUsed.usedAt).toLocaleString(
              "uz-UZ"
            )}\n\n` +
            "Boshqa kod kiritish uchun 📝 *Kod yuborish* tugmasini bosing.",
          {
            parse_mode: "Markdown",
            ...mainMenuKeyboard(),
          }
        );

        // Notify admin about self-reuse attempt
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

      // Find promo code in database
      const promoCode = await PromoCode.findOne({ code: code }).populate(
        "seasonId"
      );

      if (!promoCode) {
        await ctx.reply(CODE_NOT_FOUND(code), {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        });

        // Notify admin about not found code
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

      // Check if code already used
      if (promoCode.isUsed) {
        await ctx.reply(CODE_ALREADY_USED(code), {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        });

        // Notify admin about used code attempt
        const usedByUsage = await PromoCodeUsage.findOne({
          promoCode: code,
        });

        try {
          await ctx.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
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
              `📝 Ism: ${escapeMarkdown(
                usedByUsage?.userName || "Noma'lum"
              )}\n` +
              `📱 Telefon: ${escapeMarkdown(
                usedByUsage?.userPhone || "Noma'lum"
              )}\n\n` +
              `⏰ *Vaqt:* ${escapeMarkdown(
                new Date().toLocaleString("uz-UZ")
              )}`,
            { parse_mode: "MarkdownV2" }
          );
        } catch (error) {
          console.error("Admin notification error:", error);
        }

        return await ctx.scene.leave();
      }

      // Code is valid and unused - mark as used
      promoCode.isUsed = true;
      promoCode.usedBy = ctx.from.id;
      promoCode.usedByName = user.name;
      promoCode.usedByPhone = user.phone;
      promoCode.usedAt = new Date();
      await promoCode.save();

      // Create usage record
      await PromoCodeUsage.create({
        telegramId: ctx.from.id,
        seasonId: promoCode.seasonId,
        userName: user.name,
        userPhone: user.phone,
        userRegion: user.region,
        username: ctx.from.username,
        promoCode: code,
      });

      // Update user's last used code
      user.usedPromoCode = code;
      await user.save();

      // Get total usage count
      const usageCount = await PromoCodeUsage.countDocuments({
        telegramId: ctx.from.id,
      });

      // Send success message to user
      await ctx.reply(CODE_VERIFIED(user.name, code, user.phone), {
        parse_mode: "Markdown",
      });

      await ctx.reply(
        `📊 *Jami ishlatilgan kodlar:* ${usageCount} ta\n\n` +
          "Yana kod kiritish uchun 📝 *Kod yuborish* tugmasini bosing.\n" +
          "Profilingizni ko'rish uchun 👤 *Profilim* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );

      // Notify admin about successful code usage
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
      console.error("Promo code validation error:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  }
);

module.exports = registrationScene;
