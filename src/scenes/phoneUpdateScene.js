const { Scenes } = require("telegraf");
const User = require("../models/User");
const { contactKeyboard, mainMenuKeyboard } = require("../keyboards/keyboards");
const { normalizePhone } = require("../utils/phoneUtils");

const phoneUpdateScene = new Scenes.WizardScene(
  "phone_update",

  // Step 1: So'rov xabari
  async (ctx) => {
    await ctx.reply(
      "📱 Telefon raqamingizni yangilang\n\n" +
        "Botdagi telefon raqamingiz noto'g'ri yoki eskirgan formatda.\n\n" +
        "Quyidagi usullardan birini tanlang:\n" +
        "• Tugmani bosib kontaktingizni ulashing\n" +
        "• Yoki qo'lda kiriting: <b>+998901234567</b>",
      {
        parse_mode: "HTML",
        ...contactKeyboard(),
      }
    );
    return ctx.wizard.next();
  },

  // Step 2: Raqamni qabul qilish va saqlash
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
    }

    let phone = null;

    if (ctx.message?.contact) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.message?.text) {
      phone = ctx.message.text.trim();
    }

    const normalized = normalizePhone(phone);

    if (!normalized) {
      return await ctx.reply(
        "❌ Raqam noto'g'ri formatda.\n\n" +
          "Iltimos, tugmani bosing yoki quyidagi formatda yozing:\n" +
          "<b>+998901234567</b>",
        {
          parse_mode: "HTML",
          ...contactKeyboard(),
        }
      );
    }

    try {
      await User.updateOne(
        { telegramId: ctx.from.id },
        { phone: normalized }
      );

      await ctx.reply(
        "✅ Rahmat! Telefon raqamingiz muvaffaqiyatli yangilandi.\n\n" +
          `Yangi raqam: <b>${normalized}</b>`,
        {
          parse_mode: "HTML",
          ...mainMenuKeyboard(),
        }
      );
    } catch (err) {
      console.error("Phone update scene save error:", err);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
    }

    return await ctx.scene.leave();
  }
);

module.exports = phoneUpdateScene;
