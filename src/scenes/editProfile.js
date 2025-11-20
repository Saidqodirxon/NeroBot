const { Scenes, Markup } = require("telegraf");
const User = require("../models/User");
const {
  contactKeyboard,
  regionKeyboard,
  mainMenuKeyboard,
  cancelKeyboard,
} = require("../keyboards/keyboards");

const editProfileScene = new Scenes.WizardScene(
  "edit_profile",
  // Step 1: Tanlash nimani o'zgartirish kerak
  async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      await ctx.reply(
        "❌ Siz hali ro'yxatdan o'tmagansiz!",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }

    ctx.wizard.state.user = user;

    const info = `
📋 *Sizning ma'lumotlaringiz:*

👤 Ism: ${user.name} _(o'zgartirib bo'lmaydi)_
📱 Telefon: ${user.phone}
🗺 Viloyat: ${user.region}
🆔 Telegram ID: \`${user.telegramId}\` _(o'zgartirib bo'lmaydi)_

Nimani o'zgartirmoqchisiz?
    `;

    await ctx.reply(info, {
      parse_mode: "Markdown",
      ...Markup.keyboard([
        ["📱 Telefonni o'zgartirish"],
        ["🗺 Viloyatni o'zgartirish"],
        ["❌ Bekor qilish"],
      ]).resize(),
    });

    return ctx.wizard.next();
  },

  // Step 2: Tanlangan maydonni o'zgartirish
  async (ctx) => {
    const choice = ctx.message?.text;

    if (choice === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("❌ Bekor qilindi.", mainMenuKeyboard());
    }

    ctx.wizard.state.editField = choice;

    if (choice === "📱 Telefonni o'zgartirish") {
      await ctx.reply(
        "📱 Yangi telefon raqamingizni yuboring:",
        contactKeyboard()
      );
    } else if (choice === "🗺 Viloyatni o'zgartirish") {
      await ctx.reply("🗺 Yangi viloyatingizni tanlang:", regionKeyboard());
    } else {
      await ctx.reply("❌ Noto'g'ri tanlov. Qaytadan urinib ko'ring.");
      return ctx.wizard.back();
    }

    return ctx.wizard.next();
  },

  // Step 3: Yangi qiymatni saqlash
  async (ctx) => {
    if (ctx.message?.text === "❌ Bekor qilish") {
      await ctx.scene.leave();
      return await ctx.reply("Bekor qilindi.", mainMenuKeyboard());
    }

    const editField = ctx.wizard.state.editField;
    const user = ctx.wizard.state.user;
    let newValue = null;

    try {
      if (editField === "📱 Telefonni o'zgartirish") {
        if (ctx.message?.contact) {
          newValue = ctx.message.contact.phone_number;
        } else if (ctx.message?.text) {
          newValue = ctx.message.text;
        }

        if (!newValue) {
          return await ctx.reply(
            "Iltimos, telefon raqamingizni yuboring:",
            contactKeyboard()
          );
        }

        // Userni topib, yangilash va saqlash
        const dbUser = await User.findOne({ telegramId: ctx.from.id });
        if (dbUser) {
          dbUser.phone = newValue;
          await dbUser.save();
        }

        await ctx.reply(
          `✅ Telefon raqamingiz "${newValue}" ga o'zgartirildi!`,
          mainMenuKeyboard()
        );
      } else if (editField === "🗺 Viloyatni o'zgartirish") {
        const { REGIONS } = require("../utils/regions");
        if (!REGIONS.includes(ctx.message?.text)) {
          return await ctx.reply(
            "❌ Iltimos, viloyatni tugmalardan tanlang:",
            regionKeyboard()
          );
        }
        newValue = ctx.message.text;

        // Userni topib, yangilash va saqlash
        const dbUser = await User.findOne({ telegramId: ctx.from.id });
        if (dbUser) {
          dbUser.region = newValue;
          await dbUser.save();
        }

        await ctx.reply(
          `✅ Viloyatingiz "${newValue}" ga o'zgartirildi!`,
          mainMenuKeyboard()
        );
      }

      return await ctx.scene.leave();
    } catch (error) {
      console.error("Ma'lumotlarni o'zgartirishda xatolik:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
        mainMenuKeyboard()
      );
      return await ctx.scene.leave();
    }
  }
);

module.exports = editProfileScene;
