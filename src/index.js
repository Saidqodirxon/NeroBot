require("dotenv").config();
const { Telegraf, Scenes, session, Markup } = require("telegraf");
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/database");
const registrationScene = require("./scenes/registration");
const editProfileScene = require("./scenes/editProfile");
const viewPromoCodesScene = require("./scenes/viewPromoCodes");
const apiRoutes = require("./api/routes");
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

// Bot'ni export qilish (routes.js'da ishlatish uchun)
module.exports = { bot };

// Scene Manager
const stage = new Scenes.Stage([
  registrationScene,
  editProfileScene,
  viewPromoCodesScene,
]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// /start buyrug'i
bot.start(async (ctx) => {
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
});

// /help buyrug'i
bot.help(async (ctx) => {
  await ctx.reply(HELP_MESSAGE, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard(),
  });
});

// "📝 Promokodni kiritish" tugmasi
bot.hears("📝 Promokodni kiritish", async (ctx) => {
  // Har doim registration'ga kirish - user bir necha kod ishlata oladi
  await ctx.scene.enter("registration");
});

// "Profilim" tugmasi - ro'yxatdan o'tmagan bo'lsa registration, o'tgan bo'lsa profil + edit
bot.hears("👤 Profilim", async (ctx) => {
  const User = require("./models/User");
  const user = await User.findOne({ telegramId: ctx.from.id });

  if (!user) {
    // Ro'yxatdan o'tmagan - registrationga yo'naltirish
    await ctx.reply(
      "❌ *Siz hali ro'yxatdan o'tmagansiz!*\n\n" +
        "Ro'yxatdan o'tish uchun 📝 *Promokodni kiritish* tugmasini bosing.",
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
      ["🔙 Asosiy menyu"],
    ]).resize(),
  });
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
  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

// "Orqaga" tugmasi
bot.hears("🔙 Orqaga", async (ctx) => {
  await ctx.reply("🏠 Asosiy menyu:", mainMenuKeyboard());
});

// "Qo'llab-quvvatlash" tugmasi
bot.hears("🛠 Qo'llab-quvvatlash bilan bog'laning", async (ctx) => {
  await ctx.reply(SUPPORT_MESSAGE, {
    parse_mode: "Markdown",
  });
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

app.use(express.json());

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

// Botni ishga tushirish
bot.launch().then(() => {
  console.log("✅ Bot muvaffaqiyatli ishga tushdi");
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
