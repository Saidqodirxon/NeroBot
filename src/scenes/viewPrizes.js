const { Scenes, Markup } = require("telegraf");
const Prize = require("../models/Prize");
const Season = require("../models/Season");
const User = require("../models/User");
const MasterPrizeClaim = require("../models/MasterPrizeClaim");

const viewPrizesScene = new Scenes.BaseScene("view_prizes");

viewPrizesScene.enter(async (ctx) => {
  try {
    const seasons = await Season.find({ isActive: true }).sort({
      startDate: -1,
    });

    if (seasons.length === 0) {
      await ctx.reply("❌ Hozircha aktiv mavsumlar yo'q.", {
        ...Markup.keyboard([["🔙 Asosiy menyu"]]).resize(),
      });
      return ctx.scene.leave();
    }

    const seasonButtons = seasons.map((season) => [season.name]);
    seasonButtons.push(["🔙 Asosiy menyu"]);
    ctx.session.seasons = seasons;

    await ctx.reply("🎁 *Sovg'alar*\n\nMavsumni tanlang:", {
      parse_mode: "Markdown",
      ...Markup.keyboard(seasonButtons).resize(),
    });
  } catch (error) {
    console.error("viewPrizes enter error:", error);
    await ctx.reply("❌ Xatolik yuz berdi.", Markup.keyboard([["🔙 Asosiy menyu"]]).resize());
    ctx.scene.leave();
  }
});

// Sovg'a olish callback (inline button)
viewPrizesScene.action(/^claim_prize_(.+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const prizeId = ctx.match[1];
    const telegramId = ctx.from.id;

    const [user, prize] = await Promise.all([
      User.findOne({ telegramId }),
      Prize.findById(prizeId),
    ]);

    if (!user || !prize) {
      return ctx.reply("❌ Ma'lumot topilmadi.");
    }

    if (user.totalPoints < prize.requiredPoints) {
      return ctx.reply(
        `❌ Yetarli ball yo'q!\n\n` +
          `Kerakli: ${prize.requiredPoints} ball\n` +
          `Sizda: ${user.totalPoints} ball`
      );
    }

    const existingClaim = await MasterPrizeClaim.findOne({
      telegramId,
      prizeId,
      status: "pending",
    });

    if (existingClaim) {
      return ctx.reply("⏳ Bu sovg'a uchun arizangiz allaqachon ko'rib chiqilmoqda.");
    }

    await MasterPrizeClaim.create({
      telegramId,
      prizeId,
      prizeName: prize.name,
      requiredPoints: prize.requiredPoints,
      userName: user.name,
      userPhone: user.phone,
      status: "pending",
    });

    // Admin guruhga xabar
    const adminGroupId = process.env.ADMIN_GROUP_ID;
    if (adminGroupId) {
      try {
        const escHtml = (s) =>
          String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        await ctx.telegram.sendMessage(
          adminGroupId,
          "⭐ <b>Yangi sovg'a talabi (Usta)</b>\n\n" +
            `👤 Ism: <b>${escHtml(user.name)}</b>\n` +
            `📞 Telefon: <b>${escHtml(user.phone)}</b>\n` +
            `🆔 Telegram ID: <code>${telegramId}</code>\n` +
            `🏆 Sovg'a: <b>${escHtml(prize.name)}</b>\n` +
            `⭐ Kerakli ball: <b>${prize.requiredPoints}</b>\n` +
            `💰 Foydalanuvchi bali: <b>${user.totalPoints}</b>`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        console.error("Admin prize claim notification error:", err.message);
      }
    }

    await ctx.reply(
      "✅ <b>So'rovingiz yuborildi!</b>\n\n" +
        "Admin ko'rib chiqadi va tez orada siz bilan bog'lanadi.",
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("claim_prize action error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
});

viewPrizesScene.on("text", async (ctx) => {
  const selectedSeasonName = ctx.message.text;

  if (
    selectedSeasonName === "🔙 Asosiy menyu" ||
    selectedSeasonName === "🏠 Asosiy menyu"
  ) {
    return ctx.scene.leave();
  }

  try {
    const selectedSeason = ctx.session.seasons?.find(
      (s) => s.name === selectedSeasonName
    );

    if (!selectedSeason) {
      return ctx.reply("❌ Noto'g'ri mavsum tanlandi. Iltimos, ro'yxatdan tanlang.");
    }

    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId }).select("userType totalPoints name phone");
    const isMaster = user?.userType === "master";

    // Turga qarab sovg'alarni filter qilish
    const prizeFilter = {
      seasonId: selectedSeason._id,
      isActive: true,
      prizeType: isMaster ? "points" : "random",
    };
    const sortOrder = isMaster ? { requiredPoints: 1 } : { position: 1 };
    const prizes = await Prize.find(prizeFilter).sort(sortOrder);

    if (prizes.length === 0) {
      await ctx.reply(
        `❌ *${selectedSeason.name}* mavsumi uchun hozircha sovg'alar yo'q.`,
        { parse_mode: "Markdown" }
      );
      await ctx.reply(
        "Boshqa mavsum tanlang:",
        Markup.keyboard([
          ...ctx.session.seasons.map((s) => [s.name]),
          ["🔙 Asosiy menyu"],
        ]).resize()
      );
      return;
    }

    // Mavsum sarlavhasi
    const backButtons = Markup.keyboard([
      ...ctx.session.seasons.map((s) => [s.name]),
      ["🔙 Asosiy menyu"],
    ]).resize();

    if (isMaster) {
      const userPoints = user.totalPoints || 0;
      await ctx.reply(
        `🎁 <b>${selectedSeason.name}</b> — Ballik Sovg'alar\n\n` +
          `⭐ Sizning ballaringiz: <b>${userPoints}</b>\n` +
          `Ball yig'ib sovg'a oling!`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        `🎁 <b>${selectedSeason.name}</b> — Sovg'alar\n\n` +
          `Aksiyada g'olib bo'lib, quyidagi sovg'alardan birini yutib olishingiz mumkin! 🍀`,
        { parse_mode: "HTML" }
      );
    }

    for (const prize of prizes) {
      let caption = "";

      if (isMaster) {
        const userPoints = user.totalPoints || 0;
        const needed = prize.requiredPoints || 0;
        const canClaim = userPoints >= needed;

        // Progress bar (matn ko'rinishida)
        const progress = Math.min(Math.floor((userPoints / needed) * 10), 10);
        const progressBar = "⭐".repeat(progress) + "☆".repeat(10 - progress);

        caption =
          `🏆 <b>${prize.name}</b>\n` +
          `${prize.description ? `\n📝 ${prize.description}\n` : ""}` +
          `\n${progressBar}\n` +
          `💰 Kerakli: <b>${needed}</b> ball\n` +
          `✅ Sizda: <b>${userPoints}</b> ball`;

        const inlineBtn = canClaim
          ? Markup.inlineKeyboard([Markup.button.callback("✅ Sovg'ani olish — So'rov yuborish", `claim_prize_${prize._id}`)])
          : Markup.inlineKeyboard([Markup.button.callback(`❌ Yetarli ball yo'q (${userPoints}/${needed})`, "not_enough_points")]);

        try {
          await ctx.replyWithPhoto(prize.imageUrl, { caption, parse_mode: "HTML", ...inlineBtn });
        } catch {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineBtn });
        }
      } else {
        const medals = ["🥇", "🥈", "🥉", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅"];
        const medal = prize.position ? (medals[prize.position - 1] || "🏅") : "🎁";
        caption =
          `${medal} <b>${prize.position ? prize.position + "-o'rin sovg'asi" : "Sovg'a"}</b>\n` +
          `<b>${prize.name}</b>\n` +
          `${prize.description ? `\n📝 ${prize.description}` : ""}`;

        try {
          await ctx.replyWithPhoto(prize.imageUrl, { caption, parse_mode: "HTML" });
        } catch {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    }

    if (isMaster) {
      await ctx.reply("💡 Ko'proq kod kiritib, ko'proq ball yig'ing!", backButtons);
    } else {
      await ctx.reply("🍀 Ko'proq kod kiritib, g'olib bo'lish imkoniyatingizni oshiring!", backButtons);
    }
  } catch (error) {
    console.error("viewPrizes display error:", error);
    await ctx.reply(
      "❌ Xatolik yuz berdi.",
      Markup.keyboard([["🔙 Asosiy menyu"]]).resize()
    );
  }
});

// "Yetarli ball yo'q" inline tugmasi uchun no-op
viewPrizesScene.action("not_enough_points", async (ctx) => {
  await ctx.answerCbQuery("❌ Ball yetarli emas!", { show_alert: true });
});

viewPrizesScene.leave(async (ctx) => {
  const { mainMenuKeyboard } = require("../keyboards/keyboards");
  if (ctx.session) delete ctx.session.seasons;

  const telegramId = ctx.from?.id;
  let userType = "user";
  try {
    if (telegramId) {
      const user = await User.findOne({ telegramId }).select("userType");
      userType = user?.userType || "user";
    }
  } catch {}

  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard(userType));
});

module.exports = viewPrizesScene;
