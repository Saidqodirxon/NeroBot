/**
 * NeroBot Points Updater
 * Hamma promokodlar va usage tarixidagi 0 ballarni 1 ga o'zgartiradi.
 * Shuningdek, foydalanuvchilarning jami ballarini qayta hisoblaydi.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../src/models/User');
const PromoCode = require('../src/models/PromoCode');
const PromoCodeUsage = require('../src/models/PromoCodeUsage');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nero-bonus';

async function updatePoints() {
    try {
        console.log(`📡 MongoDB ga ulanish yuritilmoqda: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ulandi.\n');

        // 1. PromoCode jadvalidagi ballarni yangilash (0 -> 1)
        console.log('🎟  PromoCode jadvalidagi ballarni yangilash boshlandi...');
        const promoUpdate = await PromoCode.updateMany(
            { points: 0 },
            { $set: { points: 1 } }
        );
        console.log(`✅ ${promoUpdate.modifiedCount} ta promokod balli 1 ga o'zgartirildi.`);

        // 2. PromoCodeUsage jadvalidagi ballarni yangilash (0 -> 1)
        console.log('\n📝 PromoCodeUsage jadvalidagi ballarni yangilash boshlandi...');
        const usageUpdate = await PromoCodeUsage.updateMany(
            { points: 0 },
            { $set: { points: 1 } }
        );
        console.log(`✅ ${usageUpdate.modifiedCount} ta ishlatilish tarixi balli 1 ga o'zgartirildi.`);

        // 3. Userlarning jami ballarini qayta hisoblash
        console.log('\n👥 Foydalanuvchilarning jami ballarini qayta hisoblash...');
        const users = await User.find();
        let updatedUsers = 0;

        for (const user of users) {
            // Ushbu foydalanuvchi ishlatgan barcha kodlarni yig'indisini olish
            const usageAggregation = await PromoCodeUsage.aggregate([
                { $match: { telegramId: user.telegramId } },
                { $group: { _id: null, total: { $sum: "$points" } } }
            ]);

            const realPoints = usageAggregation.length > 0 ? usageAggregation[0].total : 0;

            if (user.totalPoints !== realPoints) {
                user.totalPoints = realPoints;
                await user.save();
                updatedUsers++;
            }
        }

        console.log(`✅ ${updatedUsers} ta foydalanuvchining umumiy ballari yangilandi.`);
        console.log('\n🚀 Barcha jarayonlar muvaffaqiyatli yakunlandi!');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Xatolik:', err);
        process.exit(1);
    }
}

updatePoints();
