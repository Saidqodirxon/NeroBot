const { Scenes, Markup } = require("telegraf");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const { mainMenuKeyboard } = require("../keyboards/keyboards");

const viewPromoCodesScene = new Scenes.BaseScene("view_promo_codes");

viewPromoCodesScene.enter(async (ctx) => {
  try {
    const usedCodes = await PromoCodeUsage.find({
      telegramId: ctx.from.id,
    })
      .populate("seasonId")
      .sort({ usedAt: -1 }); // Most recent first

    if (!usedCodes || usedCodes.length === 0) {
      await ctx.reply(
        "❌ *Siz hali birorta promo kod ishlatmagansiz!*\n\n" +
          "Kod kiritish uchun 📝 *Kod yuborish* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );
      return await ctx.scene.leave();
    }

    // Telegram limit: 4096 characters
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
      // Show FULL code to user (no masking for own codes)
      const fullCode = usage.promoCode;
      const dateTime = new Date(usage.usedAt).toLocaleString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      message += `${index + 1}\\. 🎟 \`${fullCode}\` • ${dateTime}\n`;
    });

    if (hasMore) {
      message += `\n⚠️ _Eng yangi ${maxCodesToShow} ta kod ko'rsatilgan_`;
    }

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      ...Markup.keyboard([["🔙 Profilga qaytish"], ["🏠 Asosiy menyu"]])
        .resize()
        .oneTime(),
    });

    // Keep the scene active so the button handlers below can respond
    return;
  } catch (error) {
    console.error("Error displaying promo codes:", error);
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
📅 *Ro'yxatdan o'tgan:* ${new Date(user.registeredAt).toLocaleDateString(
    "uz-UZ",
    { year: "numeric", month: "long", day: "numeric" }
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
