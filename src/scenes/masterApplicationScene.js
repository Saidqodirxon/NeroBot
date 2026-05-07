const { Scenes } = require("telegraf");
const User = require("../models/User");
const MasterApplication = require("../models/MasterApplication");
const { mainMenuKeyboard, cancelKeyboard } = require("../keyboards/keyboards");

const masterApplicationScene = new Scenes.WizardScene(
  "master_application",

  // Step 0: Tekshirish va kasb so'rash
  async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });

      if (!user) {
        await ctx.reply(
          "❌ Avval ro'yxatdan o'ting.",
          { reply_markup: { remove_keyboard: true } }
        );
        return ctx.scene.leave();
      }

      if (user.userType === "master") {
        await ctx.reply(
          "✅ Siz allaqachon usta maqomiga egasiz!\n\n«👨‍🔧 Mening kabinetim» tugmasini bosing.",
          mainMenuKeyboard("master")
        );
        return ctx.scene.leave();
      }

      const pendingApp = await MasterApplication.findOne({
        telegramId,
        status: "pending",
      });

      if (pendingApp) {
        await ctx.reply(
          "⏳ Sizning arizangiz allaqachon ko'rib chiqilmoqda.\n\nAdmin tasdiqlashini kuting.",
          mainMenuKeyboard("user")
        );
        return ctx.scene.leave();
      }

      ctx.wizard.state.user = {
        name: user.name,
        phone: user.phone,
        telegramId: user.telegramId,
      };

      await ctx.reply(
        "👨‍🔧 *Usta bo'lish*\n\n" +
          "Kasbingizni kiriting:\n" +
          "_Masalan: Santexnik, Elektrik, Duradgor, Bo'yoqchi, Quruvchi..._",
        {
          parse_mode: "Markdown",
          ...cancelKeyboard(),
        }
      );

      return ctx.wizard.next();
    } catch (err) {
      console.error("masterApplicationScene step 0 error:", err);
      await ctx.reply("❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
      return ctx.scene.leave();
    }
  },

  // Step 1: Kasbni olish va ariza yaratish
  async (ctx) => {
    try {
      if (!ctx.message?.text) {
        await ctx.reply("Iltimos, matn kiriting.");
        return;
      }

      const text = ctx.message.text.trim();

      if (text === "❌ Bekor qilish") {
        await ctx.reply(
          "❌ Bekor qilindi.",
          mainMenuKeyboard("user")
        );
        return ctx.scene.leave();
      }

      if (text.length < 2) {
        await ctx.reply("Kasb kamida 2 ta harfdan iborat bo'lishi kerak.");
        return;
      }

      const { telegramId, name, phone } = ctx.wizard.state.user;

      await MasterApplication.create({
        telegramId,
        name,
        phone,
        profession: text,
        status: "pending",
      });

      // Admin guruhga xabar yuborish
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
            "📋 <b>Yangi Usta Arizasi</b>\n\n" +
              `👤 Ism: <b>${escHtml(name)}</b>\n` +
              `📞 Telefon: <b>${escHtml(phone)}</b>\n` +
              `🔧 Kasb: <b>${escHtml(text)}</b>\n` +
              `🆔 Telegram ID: <code>${telegramId}</code>\n\n` +
              "Admin paneldan tasdiqlang: <b>/master-apps</b>",
            { parse_mode: "HTML" }
          );
        } catch (notifyErr) {
          console.error("Admin group notification error:", notifyErr.message);
        }
      }

      await ctx.reply(
        "✅ <b>Arizangiz qabul qilindi!</b>\n\n" +
          "Admin ko'rib chiqadi va tez orada javob beradi.\n" +
          "Tasdiqlangach, siz Usta maqomiga ega bo'lasiz.",
        {
          parse_mode: "HTML",
          ...mainMenuKeyboard("user"),
        }
      );

      return ctx.scene.leave();
    } catch (err) {
      console.error("masterApplicationScene step 1 error:", err);
      await ctx.reply("❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
      return ctx.scene.leave();
    }
  }
);

module.exports = masterApplicationScene;
