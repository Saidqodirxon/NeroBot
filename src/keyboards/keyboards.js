const { Markup } = require("telegraf");
const { REGIONS } = require("../utils/regions");

const mainMenuKeyboard = () => {
  return Markup.keyboard([
    ["📝 Kod yuborish", "👤 Profilim"],
    ["🛠 Qo'llab-quvvatlash bilan bog'laning"],
  ]).resize();
};

const contactKeyboard = () => {
  return Markup.keyboard([
    [Markup.button.contactRequest("📱 Kontaktni yuborish")],
    ["❌ Bekor qilish"],
  ]).resize();
};

const regionKeyboard = () => {
  const buttons = [];
  for (let i = 0; i < REGIONS.length; i += 2) {
    const row = [REGIONS[i]];
    if (i + 1 < REGIONS.length) {
      row.push(REGIONS[i + 1]);
    }
    buttons.push(row);
  }
  buttons.push(["❌ Bekor qilish"]);
  return Markup.keyboard(buttons).resize();
};

const cancelKeyboard = () => {
  return Markup.keyboard([["❌ Bekor qilish"]]).resize();
};

module.exports = {
  mainMenuKeyboard,
  contactKeyboard,
  regionKeyboard,
  cancelKeyboard,
};
