const { Scenes, Markup } = require("telegraf");
const Prize = require("../models/Prize");
const Season = require("../models/Season");
const User = require("../models/User");
const MasterPrizeClaim = require("../models/MasterPrizeClaim");
const { getSeasonPoints } = require("../utils/pointUtils");

const PAGE_SIZE = 5;

// ─── helper: eski xabarlarni o'chirish ───────────────────────────────────────
async function deleteMsgs(ctx, ids = []) {
  for (const id of ids) {
    try { await ctx.deleteMessage(id); } catch {}
  }
}

// ─── helper: joriy sahifa sovg'alarini yuborish ───────────────────────────────
async function showPrizesPage(ctx) {
  const state = ctx.session.prizesNav;
  if (!state) return;

  const { seasonId, seasonName, page, isMaster, userPoints, totalCount } = state;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Oldingi sahifa xabarlarini o'chirish
  const toDelete = [...(state.prizeMessageIds || [])];
  if (state.navMessageId) toDelete.push(state.navMessageId);
  state.prizeMessageIds = [];
  state.navMessageId = null;
  await deleteMsgs(ctx, toDelete);

  // Bu sahifaning sovg'alarini DB dan yuklash
  const prizeFilter = {
    seasonId,
    isActive: true,
    prizeType: isMaster ? "points" : "random",
  };
  const sortOrder = isMaster ? { requiredPoints: 1 } : { position: 1 };
  const prizes = await Prize.find(prizeFilter)
    .sort(sortOrder)
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE);

  const newMsgIds = [];

  for (const prize of prizes) {
    let msg;

    if (isMaster) {
      const needed = prize.requiredPoints || 0;
      const canClaim = userPoints >= needed;
      const progress = Math.min(Math.floor((userPoints / Math.max(needed, 1)) * 10), 10);
      const progressBar = "⭐".repeat(progress) + "☆".repeat(10 - progress);

      const caption =
        `🏆 <b>${prize.name}</b>\n` +
        (prize.description ? `\n📝 ${prize.description}\n` : "") +
        `\n${progressBar}\n` +
        `💰 Kerakli: <b>${needed}</b> ball\n` +
        `✅ Sizda: <b>${userPoints}</b> ball`;

      const inlineBtn = Markup.inlineKeyboard([
        canClaim
          ? [Markup.button.callback("✅ Sovg'ani olish — So'rov yuborish", `claim_prize_${prize._id}`)]
          : [Markup.button.callback(`❌ Yetarli ball yo'q (${userPoints}/${needed})`, "not_enough_points")],
      ]);

      msg = await ctx
        .replyWithPhoto(prize.imageUrl, { caption, parse_mode: "HTML", ...inlineBtn })
        .catch(() => ctx.reply(caption, { parse_mode: "HTML", ...inlineBtn }));
    } else {
      const medals = ["🥇", "🥈", "🥉", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅"];
      const medal = prize.position ? (medals[prize.position - 1] || "🏅") : "🎁";
      const caption =
        `${medal} <b>${prize.position ? prize.position + "-o'rin sovg'asi" : "Sovg'a"}</b>\n` +
        `<b>${prize.name}</b>\n` +
        (prize.description ? `\n📝 ${prize.description}` : "");

      msg = await ctx
        .replyWithPhoto(prize.imageUrl, { caption, parse_mode: "HTML" })
        .catch(() => ctx.reply(caption, { parse_mode: "HTML" }));
    }

    if (msg?.message_id) newMsgIds.push(msg.message_id);
  }

  // Navigatsiya xabari — sahifalar ko'p bo'lsa
  if (totalPages > 1) {
    const navRow = [];
    if (page > 0)
      navRow.push(Markup.button.callback("⬅️ Oldingi", "prizes_prev"));
    navRow.push(
      Markup.button.callback(`${page + 1} / ${totalPages}`, "prizes_page_noop")
    );
    if (page < totalPages - 1)
      navRow.push(Markup.button.callback("Keyingi ➡️", "prizes_next"));

    const suffix = isMaster
      ? "💡 Ko'proq ball yig'ib, istalgan sovg'ani oling!"
      : "🍀 Ko'proq kod kiritib, g'olib bo'lish imkoniyatingizni oshiring!";

    const navMsg = await ctx.reply(
      `📄 <b>${page + 1}/${totalPages}</b> sahifa · jami <b>${totalCount}</b> ta sovg'a\n\n${suffix}`,
      { parse_mode: "HTML", ...Markup.inlineKeyboard([navRow]) }
    );
    state.navMessageId = navMsg.message_id;
  } else {
    // Bitta sahifa — oddiy matn
    const suffix = isMaster
      ? "💡 Ko'proq ball yig'ib, istalgan sovg'ani oling!"
      : "🍀 Ko'proq kod kiritib, g'olib bo'lish imkoniyatingizni oshiring!";
    const navMsg = await ctx.reply(suffix, {
      ...Markup.keyboard([
        ...(ctx.session.seasons?.map((s) => [s.name]) || []),
        ["🔙 Asosiy menyu"],
      ]).resize(),
    });
    state.navMessageId = navMsg.message_id;
  }

  state.prizeMessageIds = newMsgIds;
  state.page = page;
}

// ═══════════════════════════════════════════════════════════════════════════════
const viewPrizesScene = new Scenes.BaseScene("view_prizes");

viewPrizesScene.enter(async (ctx) => {
  try {
    const seasons = await Season.find({ isActive: true }).sort({ startDate: -1 });

    if (seasons.length === 0) {
      await ctx.reply("❌ Hozircha aktiv mavsumlar yo'q.", {
        ...Markup.keyboard([["🔙 Asosiy menyu"]]).resize(),
      });
      return ctx.scene.leave();
    }

    const seasonButtons = seasons.map((s) => [s.name]);
    seasonButtons.push(["🔙 Asosiy menyu"]);
    ctx.session.seasons = seasons;
    ctx.session.prizesNav = null; // toza holat

    await ctx.reply("🎁 *Sovg'alar*\n\nMavsumni tanlang:", {
      parse_mode: "Markdown",
      ...Markup.keyboard(seasonButtons).resize(),
    });
  } catch (err) {
    console.error("viewPrizes enter error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.", Markup.keyboard([["🔙 Asosiy menyu"]]).resize());
    ctx.scene.leave();
  }
});

// ─── "Keyingi ➡️" inline tugmasi ─────────────────────────────────────────────
viewPrizesScene.action("prizes_next", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.prizesNav) return;
  const { page, totalCount } = ctx.session.prizesNav;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (page + 1 < totalPages) {
    ctx.session.prizesNav.page = page + 1;
    await showPrizesPage(ctx);
  }
});

// ─── "⬅️ Oldingi" inline tugmasi ─────────────────────────────────────────────
viewPrizesScene.action("prizes_prev", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.prizesNav) return;
  const { page } = ctx.session.prizesNav;
  if (page - 1 >= 0) {
    ctx.session.prizesNav.page = page - 1;
    await showPrizesPage(ctx);
  }
});

// ─── Sahifa raqami tugmasi (no-op) ───────────────────────────────────────────
viewPrizesScene.action("prizes_page_noop", async (ctx) => {
  await ctx.answerCbQuery();
});

// ─── Sovg'a olish callback ────────────────────────────────────────────────────
viewPrizesScene.action(/^claim_prize_(.+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const prizeId = ctx.match[1];
    const telegramId = ctx.from.id;

    const [user, prize] = await Promise.all([
      User.findOne({ telegramId }),
      Prize.findById(prizeId),
    ]);

    if (!user || !prize) return ctx.reply("❌ Ma'lumot topilmadi.");

    const seasonBal = await getSeasonPoints(telegramId, prize.seasonId);
    if (seasonBal < prize.requiredPoints) {
      return ctx.reply(
        `❌ Yetarli ball yo'q!\n\nKerakli: ${prize.requiredPoints} ball\nBu mavsum bali: ${seasonBal} ball`
      );
    }

    const existingClaim = await MasterPrizeClaim.findOne({
      telegramId, prizeId, status: "pending",
    });
    if (existingClaim) {
      return ctx.reply("⏳ Bu sovg'a uchun arizangiz allaqachon ko'rib chiqilmoqda.");
    }

    await MasterPrizeClaim.create({
      telegramId, prizeId,
      prizeName: prize.name,
      requiredPoints: prize.requiredPoints,
      userName: user.name,
      userPhone: user.phone,
      seasonId: prize.seasonId,
      status: "pending",
    });

    const adminGroupId = process.env.ADMIN_GROUP_ID;
    if (adminGroupId) {
      try {
        const esc = (s) =>
          String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        await ctx.telegram.sendMessage(
          adminGroupId,
          "⭐ <b>Yangi sovg'a talabi (Usta)</b>\n\n" +
            `👤 Ism: <b>${esc(user.name)}</b>\n` +
            `📞 Telefon: <b>${esc(user.phone)}</b>\n` +
            `🆔 Telegram ID: <code>${telegramId}</code>\n` +
            `🏆 Sovg'a: <b>${esc(prize.name)}</b>\n` +
            `⭐ Kerakli ball: <b>${prize.requiredPoints}</b>\n` +
            `💰 Bu mavsum bali: <b>${seasonBal}</b>`,
          { parse_mode: "HTML" }
        );
      } catch (err) {
        console.error("Admin prize claim notification error:", err.message);
      }
    }

    await ctx.reply(
      "✅ <b>So'rovingiz yuborildi!</b>\n\nAdmin ko'rib chiqadi va tez orada siz bilan bog'lanadi.",
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("claim_prize action error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.");
  }
});

// ─── Yetarli ball yo'q (no-op) ────────────────────────────────────────────────
viewPrizesScene.action("not_enough_points", async (ctx) => {
  await ctx.answerCbQuery("❌ Ball yetarli emas!", { show_alert: true });
});

// ─── Matn xabarlar: mavsum tanlash yoki orqaga ───────────────────────────────
viewPrizesScene.on("text", async (ctx) => {
  const text = ctx.message.text;

  if (text === "🔙 Asosiy menyu" || text === "🏠 Asosiy menyu") {
    return ctx.scene.leave();
  }

  try {
    const selectedSeason = ctx.session.seasons?.find((s) => s.name === text);
    if (!selectedSeason) {
      return ctx.reply("❌ Iltimos, ro'yxatdan mavsum tanlang.");
    }

    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId }).select("userType name phone");
    const isMaster = user?.userType === "master";
    const userPoints = isMaster
      ? await getSeasonPoints(telegramId, selectedSeason._id)
      : 0;

    const prizeFilter = {
      seasonId: selectedSeason._id,
      isActive: true,
      prizeType: isMaster ? "points" : "random",
    };
    const totalCount = await Prize.countDocuments(prizeFilter);

    if (totalCount === 0) {
      await ctx.reply(
        `❌ <b>${selectedSeason.name}</b> mavsumi uchun hozircha sovg'alar yo'q.`,
        { parse_mode: "HTML" }
      );
      return ctx.reply(
        "Boshqa mavsum tanlang:",
        Markup.keyboard([
          ...(ctx.session.seasons?.map((s) => [s.name]) || []),
          ["🔙 Asosiy menyu"],
        ]).resize()
      );
    }

    // Avvalgi nav holatini tozalash
    ctx.session.prizesNav = {
      seasonId: selectedSeason._id,
      seasonName: selectedSeason.name,
      page: 0,
      isMaster,
      userPoints,
      totalCount,
      prizeMessageIds: [],
      navMessageId: null,
    };

    // Sarlavha xabari
    if (isMaster) {
      await ctx.reply(
        `🎁 <b>${selectedSeason.name}</b> — Ballik Sovg'alar\n\n` +
          `📅 Bu mavsum bali: <b>${userPoints}</b> ⭐\n` +
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

    await showPrizesPage(ctx);
  } catch (err) {
    console.error("viewPrizes display error:", err);
    await ctx.reply("❌ Xatolik yuz berdi.", Markup.keyboard([["🔙 Asosiy menyu"]]).resize());
  }
});

// ─── Scene'dan chiqish ────────────────────────────────────────────────────────
viewPrizesScene.leave(async (ctx) => {
  const { mainMenuKeyboard } = require("../keyboards/keyboards");
  if (ctx.session) {
    delete ctx.session.seasons;
    delete ctx.session.prizesNav;
  }

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
