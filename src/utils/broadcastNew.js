const User = require("../models/User");

// Broadcast message to users
async function sendBroadcast(bot, message, region = null) {
  const filter = {};
  if (region && region !== "all") {
    filter.region = region;
  }

  const users = await User.find(filter);

  const results = {
    total: users.length,
    success: 0,
    failed: 0,
    blocked: 0,
  };

  console.log(`📢 Broadcast boshlandi: ${results.total} ta foydalanuvchi`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: "Markdown",
      });
      results.success++;

      // Har 25 ta xabarda progress log
      if (results.success % 25 === 0) {
        console.log(
          `✅ Yuborildi: ${results.success}/${results.total} (${user.name})`
        );
      }

      // Telegram rate limit: 30 xabar/soniya
      // Har 30 ta xabarda 1 soniya kutish
      if ((results.success + results.failed + results.blocked) % 30 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      if (error.response && error.response.error_code === 403) {
        results.blocked++;
        console.log(`🚫 Bloklagan: ${user.name} (${user.telegramId})`);
      } else {
        results.failed++;
        console.error(`❌ Xato (${user.name}):`, error.message);
      }
    }
  }

  console.log(
    `\n📊 Broadcast tugadi:\n✅ Muvaffaqiyatli: ${results.success}\n❌ Xato: ${results.failed}\n🚫 Bloklagan: ${results.blocked}\n📈 Jami: ${results.total}`
  );

  return results;
}

module.exports = { sendBroadcast };
