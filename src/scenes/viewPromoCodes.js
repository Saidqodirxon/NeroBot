const { Scenes, Markup } = require("telegraf");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const User = require("../models/User");
const { mainMenuKeyboard } = require("../keyboards/keyboards");

const viewPromoCodesScene = new Scenes.BaseScene("view_promo_codes");

viewPromoCodesScene.enter(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    const isMaster = user?.userType === "master";

    const usedCodes = await PromoCodeUsage.find({ telegramId })
      .populate("seasonId")
      .sort({ usedAt: -1 });

    if (!usedCodes || usedCodes.length === 0) {
      await ctx.reply(
        "❌ *Siz hali birorta promo kod ishlatmagansiz!*\n\n" +
          "Kod kiritish uchun 📝 *Kod yuborish* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(user?.userType),
        }
      );
      return ctx.scene.leave();
    }

    // Ustalar uchun ballarni hisoblash
    let realTotalPoints = 0;
    if (isMaster) {
      const agg = await PromoCodeUsage.aggregate([
        { $match: { telegramId } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]);
      realTotalPoints = agg.length > 0 ? agg[0].total : 0;
      if (user.totalPoints !== realTotalPoints) {
        user.totalPoints = realTotalPoints;
        await user.save();
      }
    }

    const maxCodesToShow = 30;
    const codesToShow = usedCodes.slice(0, maxCodesToShow);
    const hasMore = usedCodes.length > maxCodesToShow;

    let message;

    if (isMaster) {
      // Ustalar: kod + ball ko'rsatiladi
      message = `🎟 *Mening Kodlarim*\n\n`;
      message += `⭐ *Jami Ball:* ${realTotalPoints}\n`;
      message += `📊 *Jami Kodlar:* ${usedCodes.length} ta\n`;
      if (hasMore) message += `👁 *Ko'rsatilgan:* ${maxCodesToShow} ta\n`;
      message += `\n`;

      codesToShow.forEach((usage, i) => {
        const date = new Date(usage.usedAt).toLocaleString("uz-UZ", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        message += `${i + 1}\\. 🎟 \`${usage.promoCode}\` • ⭐ *${usage.points || 0} ball* • _${date}_\n`;
      });
    } else {
      // Oddiy userlar: faqat kod va sana (ball ko'rinmaydi)
      message = `🎟 *Mening Kodlarim*\n\n`;
      message += `📊 *Jami Kodlar:* ${usedCodes.length} ta\n\n`;

      codesToShow.forEach((usage, i) => {
        const date = new Date(usage.usedAt).toLocaleString("uz-UZ", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        message += `${i + 1}\\. 🎟 \`${usage.promoCode}\` • _${date}_\n`;
      });
    }

    if (hasMore) {
      message += `\n⚠️ _Eng yangi ${maxCodesToShow} ta kod ko'rsatilgan_`;
    }

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      ...Markup.keyboard([["🔙 Profilga qaytish"], ["🏠 Asosiy menyu"]]).resize().oneTime(),
    });
  } catch (error) {
    console.error("viewPromoCodes error:", error);
    await ctx.reply("❌ Xatolik yuz berdi.", mainMenuKeyboard());
    return ctx.scene.leave();
  }
});

viewPromoCodesScene.hears("🔙 Profilga qaytish", async (ctx) => {
  await ctx.scene.leave();
  const telegramId = ctx.from.id;
  const user = await User.findOne({ telegramId });
  if (!user) return ctx.reply("❌ Profil topilmadi!", mainMenuKeyboard());

  const codeCount = await PromoCodeUsage.countDocuments({ telegramId });
  const isMaster = user.userType === "master";

  let pointsLine = "";
  if (isMaster) {
    const agg = await PromoCodeUsage.aggregate([
      { $match: { telegramId } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const pts = agg.length > 0 ? agg[0].total : 0;
    if (user.totalPoints !== pts) { user.totalPoints = pts; await user.save(); }
    pointsLine = `\n⭐ <b>Jami Ballar:</b> ${pts}`;
  }

  const registeredDate = new Date(user.registeredAt).toLocaleDateString("uz-UZ", {
    year: "numeric", month: "long", day: "numeric",
  });
  const roleLabel = isMaster ? "👨‍🔧 Usta" : "👤 Foydalanuvchi";

  await ctx.reply(
    `👤 <b>Sizning Profilingiz</b>\n\n` +
    `📝 <b>Ism:</b> ${user.name}\n` +
    `📱 <b>Telefon:</b> ${user.phone}\n` +
    `🗺 <b>Viloyat:</b> ${user.region}\n` +
    `${user.username ? `✈️ <b>Username:</b> @${user.username}\n` : ""}` +
    `🆔 <b>Telegram ID:</b> <code>${user.telegramId}</code>` +
    pointsLine +
    `\n📊 <b>Jami Kodlar:</b> ${codeCount} ta\n` +
    `📅 <b>Ro'yxatdan o'tgan:</b> ${registeredDate}\n` +
    `🔖 <b>Rol:</b> ${roleLabel}`,
    {
      parse_mode: "HTML",
      ...Markup.keyboard([["✏️ Ma'lumotlarni o'zgartirish"], ["🏠 Asosiy menyu"]]).resize(),
    }
  );
});

viewPromoCodesScene.hears("🏠 Asosiy menyu", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id }).select("userType");
  await ctx.scene.leave();
  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard(user?.userType));
});

module.exports = viewPromoCodesScene;
