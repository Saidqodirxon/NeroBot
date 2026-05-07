const { Scenes } = require("telegraf");
const User = require("../models/User");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const { mainMenuKeyboard, masterCabinetKeyboard } = require("../keyboards/keyboards");

const masterCabinetScene = new Scenes.BaseScene("master_cabinet");

masterCabinetScene.enter(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });

    if (!user || user.userType !== "master") {
      await ctx.reply(
        "❌ Bu bo'lim faqat ustalar uchun.\n\n" +
          "Usta bo'lish uchun «👨‍🔧 Usta bo'lish» tugmasini bosing.",
        mainMenuKeyboard("user")
      );
      return ctx.scene.leave();
    }

    const usageCount = await PromoCodeUsage.countDocuments({ telegramId });

    await ctx.reply(
      "👨‍🔧 <b>Usta Kabineti</b>\n\n" +
        `👤 Ism: <b>${user.name || "—"}</b>\n` +
        `📞 Telefon: <b>${user.phone || "—"}</b>\n` +
        `🔧 Kasb: <b>${user.profession || "—"}</b>\n` +
        `📍 Viloyat: <b>${user.region || "—"}</b>\n` +
        `⭐ Jami ballar: <b>${user.totalPoints || 0}</b>\n` +
        `📋 Yuborilgan kodlar: <b>${usageCount}</b>\n\n` +
        "💡 <i>Ballaringiz bilan Sovg'alar bo'limida mukofot oling!</i>",
      {
        parse_mode: "HTML",
        ...masterCabinetKeyboard(),
      }
    );
  } catch (err) {
    console.error("masterCabinetScene enter error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.");
    return ctx.scene.leave();
  }
});

masterCabinetScene.hears("📊 Ballarim tarixi", async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const usages = await PromoCodeUsage.find({ telegramId })
      .sort({ usedAt: -1 })
      .limit(30);

    if (usages.length === 0) {
      await ctx.reply(
        "📋 Hali promokod yuborilmagan.\n\n«📝 Kod yuborish» tugmasini bosing.",
        masterCabinetKeyboard()
      );
      return;
    }

    const user = await User.findOne({ telegramId }).select("totalPoints");
    let message = `⭐ <b>Ball tarixi</b> (oxirgi ${usages.length} ta)\n`;
    message += `💰 Jami: <b>${user?.totalPoints || 0} ball</b>\n\n`;

    usages.forEach((u, i) => {
      const date = new Date(u.usedAt).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      message += `${i + 1}. <code>${u.promoCode}</code> — <b>+${u.points} ball</b>\n`;
      message += `   📅 ${date}\n`;
    });

    await ctx.reply(message, { parse_mode: "HTML", ...masterCabinetKeyboard() });
  } catch (err) {
    console.error("masterCabinetScene ballar tarixi error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
});

masterCabinetScene.hears("📋 Kodlarim", async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const usages = await PromoCodeUsage.find({ telegramId })
      .sort({ usedAt: -1 })
      .limit(30);

    if (usages.length === 0) {
      await ctx.reply(
        "📋 Hali promokod yuborilmagan.",
        masterCabinetKeyboard()
      );
      return;
    }

    let message = `📋 <b>Mening kodlarim</b> (${usages.length} ta)\n\n`;

    usages.forEach((u, i) => {
      const date = new Date(u.usedAt).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
      message += `${i + 1}. <code>${u.promoCode}</code> — ${u.points} ball — ${date}\n`;
    });

    await ctx.reply(message, { parse_mode: "HTML", ...masterCabinetKeyboard() });
  } catch (err) {
    console.error("masterCabinetScene kodlarim error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
});

masterCabinetScene.hears("🏠 Asosiy menyu", async (ctx) => {
  await ctx.reply("Asosiy menyu:", mainMenuKeyboard("master"));
  return ctx.scene.leave();
});

masterCabinetScene.on("message", async (ctx) => {
  await ctx.reply(
    "Quyidagi tugmalardan foydalaning:",
    masterCabinetKeyboard()
  );
});

module.exports = masterCabinetScene;
