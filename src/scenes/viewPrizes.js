const { Scenes, Markup } = require("telegraf");
const Prize = require("../models/Prize");
const Season = require("../models/Season");

const viewPrizesScene = new Scenes.BaseScene("view_prizes");

// Scene'ga kirganda - mavsumlarni ko'rsatish
viewPrizesScene.enter(async (ctx) => {
  try {
    // Aktiv mavsumlarni olish
    const seasons = await Season.find({ isActive: true }).sort({
      startDate: -1,
    });

    if (seasons.length === 0) {
      await ctx.reply("❌ Hozircha aktiv mavsumlar yo'q.", {
        parse_mode: "Markdown",
        ...Markup.keyboard([["🔙 Asosiy menyu"]]).resize(),
      });
      return await ctx.scene.leave();
    }

    // Mavsum tugmalarini yaratish
    const seasonButtons = seasons.map((season) => [season.name]);
    seasonButtons.push(["🔙 Asosiy menyu"]);

    ctx.session.seasons = seasons; // Sessiyaga saqlash

    await ctx.reply("🎁 *Sovg'alar*\n\nMavsumni tanlang:", {
      parse_mode: "Markdown",
      ...Markup.keyboard(seasonButtons).resize(),
    });
  } catch (error) {
    console.error("Seasons loading error:", error);
    await ctx.reply(
      "❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
      Markup.keyboard([["🔙 Asosiy menyu"]]).resize()
    );
    await ctx.scene.leave();
  }
});

// Mavsum tanlanganida - sovg'alarni ko'rsatish
viewPrizesScene.on("text", async (ctx) => {
  const selectedSeasonName = ctx.message.text;

  // Asosiy menyuga qaytish
  if (
    selectedSeasonName === "🔙 Asosiy menyu" ||
    selectedSeasonName === "🏠 Asosiy menyu"
  ) {
    return await ctx.scene.leave();
  }

  try {
    // Tanlangan mavsumni topish
    const selectedSeason = ctx.session.seasons?.find(
      (s) => s.name === selectedSeasonName
    );

    if (!selectedSeason) {
      return await ctx.reply(
        "❌ Noto'g'ri mavsum tanlandi. Iltimos, ro'yxatdan tanlang."
      );
    }

    // Mavsum uchun sovg'alarni olish
    const prizes = await Prize.find({
      seasonId: selectedSeason._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (prizes.length === 0) {
      await ctx.reply(
        `❌ *${selectedSeason.name}* mavsumi uchun hozircha sovg'alar yo'q.`,
        {
          parse_mode: "Markdown",
        }
      );

      // Orqaga tugmasini ko'rsatish
      await ctx.reply(
        "Boshqa mavsum tanlang:",
        Markup.keyboard([
          ...ctx.session.seasons.map((s) => [s.name]),
          ["🔙 Asosiy menyu"],
        ]).resize()
      );
      return;
    }

    // Mavsum nomini ko'rsatish
    await ctx.reply(
      `🎁 *${selectedSeason.name}* - Sovg'alar ro'yxati\n\n` +
        `Bizning aksiyalarimizda g'olib bo'lib, quyidagi sovg'alardan birini yutib olishingiz mumkin!`,
      {
        parse_mode: "Markdown",
      }
    );

    // Har bir sovg'ani ko'rsatish
    for (const prize of prizes) {
      const caption =
        `<b>${prize.name}</b>` +
        `${prize.description ? "\n\n" + prize.description : ""}`;

      try {
        // Rasmni yuborish
        await ctx.replyWithPhoto(prize.imageUrl, {
          caption: caption,
          parse_mode: "HTML",
        });
      } catch (err) {
        console.error("Prize image send error:", err);
        // Agar rasm yuklanmasa, faqat textni yuborish
        await ctx.reply(caption + "\n\n❌ (Rasm yuklanmadi)", {
          parse_mode: "HTML",
        });
      }
    }

    await ctx.reply(
      "Ko'proq kod kiritib, g'olib bo'lish imkoniyatingizni oshiring! 🍀\n\n" +
        "Boshqa mavsum tanlang yoki asosiy menyuga qayting:",
      Markup.keyboard([
        ...ctx.session.seasons.map((s) => [s.name]),
        ["🔙 Asosiy menyu"],
      ]).resize()
    );
  } catch (error) {
    console.error("Prizes display error:", error);
    await ctx.reply(
      "❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.",
      Markup.keyboard([["🔙 Asosiy menyu"]]).resize()
    );
  }
});

// Scene'dan chiqish
viewPrizesScene.leave(async (ctx) => {
  const { mainMenuKeyboard } = require("../keyboards/keyboards");

  // Session tozalash
  if (ctx.session) {
    delete ctx.session.seasons;
  }

  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

module.exports = viewPrizesScene;
