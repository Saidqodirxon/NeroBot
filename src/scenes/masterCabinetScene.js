const { Scenes } = require("telegraf");
const User = require("../models/User");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const MasterPrizeClaim = require("../models/MasterPrizeClaim");
const Season = require("../models/Season");
const { mainMenuKeyboard, masterCabinetKeyboard } = require("../keyboards/keyboards");
const { getSeasonPoints } = require("../utils/pointUtils");

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

    // Har mavsum uchun alohida bal ko'rsatish
    const seasons = await Season.find({}).sort({ startDate: -1 });
    let seasonLines = "";
    for (const season of seasons) {
      const bal = await getSeasonPoints(telegramId, season._id);
      if (bal > 0) {
        seasonLines += `\n📅 <b>${season.name}</b>: <b>${bal}</b> ball`;
      }
    }

    await ctx.reply(
      "👨‍🔧 <b>Usta Kabineti</b>\n\n" +
        `👤 Ism: <b>${user.name || "—"}</b>\n` +
        `📞 Telefon: <b>${user.phone || "—"}</b>\n` +
        `🔧 Kasb: <b>${user.profession || "—"}</b>\n` +
        `📍 Viloyat: <b>${user.region || "—"}</b>\n` +
        `⭐ Jami ballar: <b>${user.totalPoints || 0}</b>\n` +
        (seasonLines ? `\n<b>Mavsum bo'yicha:</b>${seasonLines}\n` : "") +
        `\n📋 Yuborilgan kodlar: <b>${usageCount}</b>\n\n` +
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

    const [usages, claims] = await Promise.all([
      PromoCodeUsage.find({ telegramId }).sort({ usedAt: -1 }).limit(30),
      MasterPrizeClaim.find({ telegramId }).sort({ createdAt: -1 }).limit(20).populate("seasonId", "name"),
    ]);

    if (usages.length === 0 && claims.length === 0) {
      await ctx.reply(
        "📋 Hali promokod yuborilmagan va sovg'a arizasi yo'q.\n\n«📝 Kod yuborish» tugmasini bosing.",
        masterCabinetKeyboard()
      );
      return;
    }

    const user = await User.findOne({ telegramId }).select("totalPoints");

    // Birlashtirib sort qilish
    const events = [
      ...usages.map((u) => ({
        type: "code",
        date: u.usedAt,
        promoCode: u.promoCode,
        points: u.points,
      })),
      ...claims.map((c) => ({
        type: "claim",
        date: c.createdAt,
        prizeName: c.prizeName,
        requiredPoints: c.requiredPoints,
        status: c.status,
        seasonName: c.seasonId?.name || null,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40);

    let message = `⭐ <b>Ball tarixi</b>\n`;
    message += `💰 Jami: <b>${user?.totalPoints || 0} ball</b>\n\n`;

    events.forEach((e, i) => {
      const date = new Date(e.date).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      if (e.type === "code") {
        message += `${i + 1}. <code>${e.promoCode}</code> — <b>+${e.points} ball</b>\n`;
        message += `   📅 ${date}\n`;
      } else {
        const icon = e.status === "given" ? "🎁" : "⏳";
        const balLine = e.status === "given"
          ? ` — <b>-${e.requiredPoints} ball</b>`
          : ` (${e.requiredPoints} ball)`;
        const seasonLine = e.seasonName ? ` [${e.seasonName}]` : "";
        message += `${i + 1}. ${icon} ${e.status === "given" ? "Berildi" : "Ariza"}: <b>${e.prizeName}</b>${seasonLine}${balLine}\n`;
        message += `   📅 ${date}\n`;
      }
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
