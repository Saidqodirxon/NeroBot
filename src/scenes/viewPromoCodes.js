const { Scenes, Markup } = require("telegraf");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const { mainMenuKeyboard } = require("../keyboards/keyboards");

// Promo kodni maskirovka qilish funksiyasi (faqat birinchi 3 harfni ko'rsatish)
const maskPromoCode = (code) => {
  if (!code || code.length < 4) return code;
  return code.slice(0, 3) + "*".repeat(code.length - 3);
};

const viewPromoCodesScene = new Scenes.BaseScene("view_promo_codes");

viewPromoCodesScene.enter(async (ctx) => {
  try {
    const usedCodes = await PromoCodeUsage.find({
      telegramId: ctx.from.id,
    }).sort({ usedAt: -1 }); // Eng yangilarini birinchi

    if (!usedCodes || usedCodes.length === 0) {
      await ctx.reply(
        "❌ *Siz hali birorta promo kod ishlatmagansiz!*\n\n" +
          "Kod kiritish uchun 📝 *Promokodni kiritish* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );
      return await ctx.scene.leave();
    }

    // Telegram limit: 4096 characters
    // Har bir kod ~40 char, max 30ta kod = ~1200 char (xavfsiz)
    const maxCodesToShow = 30;
    const codesToShow = usedCodes.slice(0, maxCodesToShow);
    const hasMore = usedCodes.length > maxCodesToShow;

    let message = `🎟 *Ishlatilgan Kodlaringiz*\n\n`;
    message += `📊 *Jami:* ${usedCodes.length} ta\n`;
    if (hasMore) {
      message += `👁 *Ko'rsatilgan:* ${maxCodesToShow} ta\n`;
    }
    message += `\n`;

    codesToShow.forEach((usage, index) => {
      const maskedCode = maskPromoCode(usage.promoCode);
      const date = new Date(usage.usedAt).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
      });

      message += `${index + 1}\. 🎟 \`${maskedCode}\` • ${date}\n`;
    });

    if (hasMore) {
      message += `\n⚠️ _Eng yangi ${maxCodesToShow} ta kod ko'rsatilgan_`;
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...Markup.keyboard([["🔙 Profilga qaytish"], ["🏠 Asosiy menyu"]])
        .resize()
        .oneTime(),
    });

    // Keep the scene active so the button handlers below can respond
    // User will press "🔙 Profilga qaytish" or "🏠 Asosiy menyu"
    return;
  } catch (error) {
    console.error("Promo kodlarni ko'rsatishda xatolik:", error);
    await ctx.reply(
      "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      mainMenuKeyboard()
    );
    return await ctx.scene.leave();
  }
});

// "Profilga qaytish" tugmasi
viewPromoCodesScene.hears("🔙 Profilga qaytish", async (ctx) => {
  await ctx.scene.leave();
  // Profilni ko'rsatish uchun "Profilim" tugmasini simulatsiya qilish
  const User = require("../models/User");
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (!user) {
    return await ctx.reply("❌ Profil topilmadi!", mainMenuKeyboard());
  }

  const codeCount = await PromoCodeUsage.countDocuments({
    telegramId: ctx.from.id,
  });

  const profileInfo = `
👤 *Sizning Profilingiz*

📝 *Ism:* ${user.name}
📱 *Telefon:* ${user.phone}
🗺 *Viloyat:* ${user.region}
${user.username ? `✈️ *Username:* @${user.username}` : ""}
🆔 *Telegram ID:* \`${user.telegramId}\`
📊 *Jami kodlar:* ${codeCount} ta
📅 *Ro'yxatdan o'tgan sana:* ${new Date(user.registeredAt).toLocaleString(
    "uz-UZ"
  )}
  `;

  await ctx.reply(profileInfo, {
    parse_mode: "Markdown",
    ...Markup.keyboard([
      ["🎟 Barcha kodlarimni ko'rish"],
      ["✏️ Ma'lumotlarni o'zgartirish"],
      ["🏠 Asosiy menyu"],
    ]).resize(),
  });
});

// "Asosiy menyu" tugmasi
viewPromoCodesScene.hears("🏠 Asosiy menyu", async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

module.exports = viewPromoCodesScene;
