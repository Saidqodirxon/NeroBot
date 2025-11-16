const User = require('../models/User');

/**
 * Reklama xabarini barcha foydalanuvchilarga yuborish
 * Telegram rate limiting'ni hisobga olgan holda
 * @param {Object} bot - Telegraf bot instance
 * @param {string} message - Yuborilishi kerak bo'lgan xabar
 * @param {Object} options - Qo'shimcha parametrlar (parse_mode, reply_markup)
 * @returns {Object} Natijalar
 */
async function broadcastMessage(bot, message, options = {}) {
  try {
    const users = await User.find({}, 'telegramId');
    
    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      blocked: 0,
      errors: []
    };

    // Telegram rate limiting: 30 xabar/sekund
    const MESSAGES_PER_SECOND = 25; // Xavfsizlik uchun 25
    const DELAY_MS = 1000 / MESSAGES_PER_SECOND; // ~40ms

    console.log(`📢 Reklama yuborish boshlandi: ${users.length} foydalanuvchi`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        await bot.telegram.sendMessage(user.telegramId, message, {
          parse_mode: options.parse_mode || 'Markdown',
          ...options
        });
        
        results.success++;
        
        // Progress log har 100 ta xabar uchun
        if ((i + 1) % 100 === 0) {
          console.log(`📊 Progress: ${i + 1}/${users.length} (${results.success} muvaffaqiyatli)`);
        }

      } catch (error) {
        results.failed++;
        
        // Foydalanuvchi botni to'xtatgan
        if (error.response && error.response.error_code === 403) {
          results.blocked++;
          // Ixtiyoriy: foydalanuvchini ma'lumotlar bazasidan o'chirish
          // await User.deleteOne({ telegramId: user.telegramId });
        } else {
          results.errors.push({
            userId: user.telegramId,
            error: error.message
          });
          console.error(`❌ Xatolik (User ${user.telegramId}):`, error.message);
        }
      }

      // Rate limiting delay
      if (i < users.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`✅ Reklama yuborish tugadi`);
    console.log(`📊 Natijalar:`, {
      total: results.total,
      success: results.success,
      failed: results.failed,
      blocked: results.blocked
    });

    return results;

  } catch (error) {
    console.error('❌ Reklama yuborishda umumiy xatolik:', error);
    throw error;
  }
}

/**
 * Kutish funksiyasi
 * @param {number} ms - Millisekund
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Telegram guruhiga yoki kanalga xabar yuborish
 * @param {Object} bot - Telegraf bot instance
 * @param {string} chatId - Guruh yoki kanal ID
 * @param {string} message - Xabar matni
 * @param {Object} options - Qo'shimcha parametrlar
 */
async function sendToChannel(bot, chatId, message, options = {}) {
  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: options.parse_mode || 'Markdown',
      ...options
    });
    console.log(`✅ Kanal/guruhga xabar yuborildi: ${chatId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Kanal/guruhga xabar yuborishda xatolik:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  broadcastMessage,
  sendToChannel
};
