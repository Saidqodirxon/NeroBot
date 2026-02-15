require("dotenv").config();
const { Telegraf, Scenes, session, Markup } = require("telegraf");
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/database");
const registrationScene = require("./scenes/registrationNew");
const editProfileScene = require("./scenes/editProfile");
const viewPromoCodesScene = require("./scenes/viewPromoCodes");
const viewPrizesScene = require("./scenes/viewPrizes");
const apiRoutes = require("./api/routesNew");
const authRoutes = require("./api/auth");
const { mainMenuKeyboard } = require("./keyboards/keyboards");
const {
  WELCOME_MESSAGE,
  SUPPORT_MESSAGE,
  HELP_MESSAGE,
} = require("./utils/messages");
const { broadcastMessage } = require("./utils/broadcast");

// Ma'lumotlar bazasiga ulanish
connectDB();

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN);

// Bot instanceni API routesga o'tkazish (g'olib notification uchun)
const { setBotInstance } = require("./api/routesNew");
setBotInstance(bot);

// Bot'ni export qilish (routes.js'da ishlatish uchun)
module.exports = { bot };

// Scene Manager
const stage = new Scenes.Stage([
  registrationScene,
  editProfileScene,
  viewPromoCodesScene,
  viewPrizesScene,
]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Blocked user check middleware - ENG BIRINCHI tekshirish
bot.use(async (ctx, next) => {
  // Faqat private chatdagi oddiy userlar uchun
  if (ctx.chat?.type === "private" && ctx.from?.id) {
    try {
      const User = require("./models/User");
      const user = await User.findOne({ telegramId: ctx.from.id });

      if (user && user.isBlocked) {
        const supportUsername = process.env.SUPPORT_USERNAME || "support";
        const blockReason =
          user.blockedReason || "Adminlar tomonidan bloklangan";

        // HTML uchun maxsus belgilarni escape qilish
        const escapeHtml = (text) => {
          return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        };

        await ctx.reply(
          "🚫 <b>SIZ BLOKLANGANSIZ</b>\n\n" +
            `❌ Sabab: ${escapeHtml(blockReason)}\n\n` +
            "Siz botdan foydalana olmaysiz.\n\n" +
            `📞 Texnik yordam uchun: @${supportUsername}`,
          {
            parse_mode: "HTML",
            reply_markup: {
              remove_keyboard: true,
            },
          }
        );
        return; // HECH QANDAY keyingi handlerga o'tmasin
      }
    } catch (error) {
      console.error("Block check error:", error);
    }
  }
  return next();
});

// Private chat only middleware - guruhda ishlamaslik uchun
bot.use(async (ctx, next) => {
  // Faqat private chatlarni qabul qilish
  if (ctx.chat?.type !== "private") {
    console.log(`Group message from ${ctx.chat.id} (${ctx.chat.type})`);

    // Faqat botni mention qilganda yoki commandlarda javob berish
    const isMentioned = ctx.message?.text?.includes(
      `@${process.env.BOT_USERNAME}`
    );
    const isCommand = ctx.message?.text?.startsWith("/");
    const isReplyToBot =
      ctx.message?.reply_to_message?.from?.id === ctx.botInfo?.id;

    if (isMentioned || isCommand || isReplyToBot) {
      // Botni chaqirganda xabar yuborish
      try {
        await ctx.reply(
          "⚠️ Bot faqat shaxsiy chatda ishlaydi.\n\n" +
            "Iltimos, botni shaxsiy chatda ishga tushiring: @" +
            process.env.BOT_USERNAME,
          {
            reply_markup: {
              remove_keyboard: true,
            },
          }
        );
      } catch (err) {
        console.error("Group reply error:", err);
      }
    }

    return; // Guruh xabarlarini ignore qilish
  }
  return next();
});

// /start buyrug'i
bot.start(async (ctx) => {
  try {
    // Eski session va keyboard cache'ni tozalash
    if (ctx.session) {
      ctx.session = {};
    }

    // Scene'dan chiqish (agar scene ichida bo'lsa)
    await ctx.scene.leave().catch(() => {});

    const User = require("./models/User");
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (user) {
      // Ro'yxatdan o'tgan foydalanuvchi
      await ctx.reply(
        `👋 *Xush kelibsiz, ${user.name}!*\n\n` +
          "Asosiy menyudan kerakli bo'limni tanlang:",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );
    } else {
      // Yangi foydalanuvchi
      await ctx.reply(WELCOME_MESSAGE, {
        parse_mode: "Markdown",
        ...mainMenuKeyboard(),
      });
    }
  } catch (error) {
    console.error("Start command error:", error);
    await ctx.reply(
      "Xush kelibsiz! Asosiy menyudan kerakli bo'limni tanlang:",
      mainMenuKeyboard()
    );
  }
});

// /help buyrug'i
bot.help(async (ctx) => {
  await ctx.reply(HELP_MESSAGE, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
});

// "📝 Kod yuborish" tugmasi
bot.hears("📝 Kod yuborish", async (ctx) => {
  // Har doim registration'ga kirish - user bir necha kod ishlata oladi
  await ctx.scene.enter("registration");
});

// "Profilim" tugmasi - ro'yxatdan o'tmagan bo'lsa registration, o'tgan bo'lsa profil + edit
bot.hears("👤 Profilim", async (ctx) => {
  try {
    const User = require("./models/User");
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      // Ro'yxatdan o'tmagan - registrationga yo'naltirish
      await ctx.reply(
        "❌ *Siz hali ro'yxatdan o'tmagansiz!*\n\n" +
          "Ro'yxatdan o'tish uchun 📝 *Kod yuborish* tugmasini bosing.",
        {
          parse_mode: "Markdown",
          ...mainMenuKeyboard(),
        }
      );
      return;
    }

    // Ro'yxatdan o'tgan - profil ko'rsatish va edit tugmasi
    const PromoCodeUsage = require("./models/PromoCodeUsage");
    const codeCount = await PromoCodeUsage.countDocuments({
      telegramId: ctx.from.id,
    });

    // Recalculate total points from usage history to ensure accuracy
    const pointsAggregation = await PromoCodeUsage.aggregate([
      { $match: { telegramId: ctx.from.id } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const realTotalPoints =
      pointsAggregation.length > 0 ? pointsAggregation[0].total : 0;

    // Sync User model if different
    if (user.totalPoints !== realTotalPoints) {
      user.totalPoints = realTotalPoints;
      await user.save();
    }

    const registeredDate = new Date(user.registeredAt).toLocaleDateString(
      "uz-UZ",
      { year: "numeric", month: "long", day: "numeric" }
    );

    const profileInfo = `
👤 <b>Sizning Profilingiz</b>

📝 <b>Ism:</b> ${user.name}
📱 <b>Telefon:</b> ${user.phone}
🗺 <b>Viloyat:</b> ${user.region}
${user.username ? `✈️ <b>Username:</b> @${user.username}` : ""}
🆔 <b>Telegram ID:</b> <code>${user.telegramId}</code>

💰 <b>Jami Ballar:</b> ${realTotalPoints}
📊 <b>Jami Kodlar:</b> ${codeCount} ta
📅 <b>Ro'yxatdan o'tgan:</b> ${registeredDate}
  `;

    await ctx.reply(profileInfo, {
      parse_mode: "HTML",
      ...Markup.keyboard([
        ["✏️ Ma'lumotlarni o'zgartirish"],
        ["🏠 Asosiy menyu"],
      ]).resize(),
    });
  } catch (error) {
    console.error("Profile loading error:", error);
    await ctx.reply(
      "❌ Profilni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      mainMenuKeyboard()
    );
  }
});

// "✏️ Ma'lumotlarni o'zgartirish" tugmasi
bot.hears("✏️ Ma'lumotlarni o'zgartirish", async (ctx) => {
  await ctx.scene.enter("edit_profile");
});

// "🎟 Barcha kodlarimni ko'rish" tugmasi
bot.hears("🎟 Barcha kodlarimni ko'rish", async (ctx) => {
  await ctx.scene.enter("view_promo_codes");
});

// "🎟 Barcha kodlarimni ko'rish" tugmasi
bot.hears("🎟 Barcha kodlarimni ko'rish", async (ctx) => {
  await ctx.scene.enter("view_promo_codes");
});

// "Asosiy menyu" tugmasi
bot.hears("🔙 Asosiy menyu", async (ctx) => {
  // Session va scene cache'ni tozalash
  if (ctx.session) {
    ctx.session = {};
  }
  await ctx.scene.leave().catch(() => {});

  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

// "🏠 Asosiy menyu" tugmasi
bot.hears("🏠 Asosiy menyu", async (ctx) => {
  // Session va scene cache'ni tozalash
  if (ctx.session) {
    ctx.session = {};
  }
  await ctx.scene.leave().catch(() => {});

  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

// "Orqaga" tugmasi
bot.hears("🔙 Orqaga", async (ctx) => {
  // Session va scene cache'ni tozalash
  if (ctx.session) {
    ctx.session = {};
  }
  await ctx.scene.leave().catch(() => {});

  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

// "Qo'llab-quvvatlash" tugmasi
bot.hears("🛠 Qo'llab-quvvatlash bilan bog'laning", async (ctx) => {
  await ctx.reply(SUPPORT_MESSAGE, {
    parse_mode: "HTML",
  });
});

// "Sovg'alar" tugmasi
bot.hears("🎁 Sovg'alar", async (ctx) => {
  await ctx.scene.enter("view_prizes");
});

// Broadcast buyrug'i (faqat admin uchun)
bot.command("broadcast", async (ctx) => {
  const adminIds = process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim()))
    : [];

  if (!adminIds.includes(ctx.from.id)) {
    return await ctx.reply("❌ Sizda bu buyruqni bajarish huquqi yo'q.");
  }

  const message = ctx.message.text.replace("/broadcast", "").trim();

  if (!message) {
    return await ctx.reply(
      "❌ Xabar matni bo'sh bo'lmasligi kerak.\n\nMisol: /broadcast Yangi aksiya!"
    );
  }

  await ctx.reply("📢 Reklama yuborish boshlandi...");

  try {
    const results = await broadcastMessage(bot, message);

    await ctx.reply(
      `✅ Reklama yuborish tugadi!\n\n` +
        `📊 Natijalar:\n` +
        `👥 Jami: ${results.total}\n` +
        `✅ Muvaffaqiyatli: ${results.success}\n` +
        `❌ Xatolik: ${results.failed}\n` +
        `🚫 Bot to'xtatgan: ${results.blocked}`
    );
  } catch (error) {
    await ctx.reply("❌ Reklama yuborishda xatolik yuz berdi.");
  }
});

// Statistika buyrug'i (faqat admin uchun)
bot.command("stats", async (ctx) => {
  const adminIds = process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(",").map((id) => parseInt(id.trim()))
    : [];

  if (!adminIds.includes(ctx.from.id)) {
    return await ctx.reply("❌ Sizda bu buyruqni bajarish huquqi yo'q.");
  }

  try {
    const PromoCode = require("./models/PromoCode");
    const User = require("./models/User");

    const totalCodes = await PromoCode.countDocuments();
    const usedCodes = await PromoCode.countDocuments({ isUsed: true });
    const unusedCodes = await PromoCode.countDocuments({ isUsed: false });
    const totalUsers = await User.countDocuments();

    await ctx.reply(
      `📊 *Statistika*\n\n` +
        `🎟 Jami kodlar: ${totalCodes}\n` +
        `✅ Ishlatilgan: ${usedCodes}\n` +
        `⏳ Ishlatilmagan: ${unusedCodes}\n` +
        `👥 Foydalanuvchilar: ${totalUsers}\n` +
        `📈 Foydalanish: ${
          totalCodes > 0 ? ((usedCodes / totalCodes) * 100).toFixed(2) : 0
        }%`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Statistika olishda xatolik:", error);
    await ctx.reply("❌ Statistika olishda xatolik yuz berdi.");
  }
});

// Xatoliklarni ushlash
bot.catch((err, ctx) => {
  console.error("Bot xatolik:", err);
  ctx.reply("❌ Xatolik yuz berdi. Iltimos, keyinroq qaytadan urinib ko'ring.");
});

// Express server (Admin API)
const app = express();

// CORS sozlamalari - frontend va backend uchun
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // Vite dev server
  process.env.FRONTEND_URL,
  process.env.DOMAIN,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS: Origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

// Allow larger JSON/urlencoded payloads so admins can add many promo codes at once
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Static files uchun
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));
}

// API routes
app.use("/api/v1", apiRoutes);
app.use("/api/v1/auth", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Bot ishlayapti", timestamp: new Date() });
});

// Production mode'da React app'ni serve qilish
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin/dist/index.html"));
  });
}

// Serverni ishga tushirish
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API server ishga tushdi: http://localhost:${PORT}`);
});

// Botni ishga tushirish (Retry logic bilan)
const launchBot = async (retries = 5, delay = 5000) => {
  try {
    await bot.launch();
    console.log("✅ Bot muvaffaqiyatli ishga tushdi");
  } catch (error) {
    console.error("❌ Botni ishga tushirishda xatolik:", error.message);
    if (retries > 0) {
      console.log(
        `🔄 Qayta urinib ko'rilmoqda... (${retries} ta urinish qoldi)`
      );
      setTimeout(() => launchBot(retries - 1, delay), delay);
    } else {
      console.error("❌ Botni ishga tushirib bo'lmadi. Internetni tekshiring.");
    }
  }
};

launchBot();

// Global xatoliklarni ushlash (Process crash oldini olish uchun)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Processni o'ldirmaymiz, faqat log qilamiz
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Processni o'ldirmaymiz, faqat log qilamiz
});

// Graceful shutdown
process.once("SIGINT", () => {
  bot.stop("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
  process.exit(0);
});
