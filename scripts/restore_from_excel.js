/**
 * NeroBot Final Aggressive Restore
 * Har qanday holatda Excel'dagi kodni bazadagi 280k ichidan topadi 
 * va updateOne bilan majburiy ISHLATILGAN (isUsed: true) qiladi.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Modellarni yuklash
const User = require('../src/models/User');
const PromoCode = require('../src/models/PromoCode');
const PromoCodeUsage = require('../src/models/PromoCodeUsage');
const Season = require('../src/models/Season');

// .env dan ulanishni olish (agar bo'lmasa localhost)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nerobot';
const EXCEL_FILE = path.join(__dirname, '..', 'НЕРО_база_испоьзовнных_кадов_до_27_03.xlsx');

async function aggressiveRestore() {
    try {
        console.log(`📡 MongoDB ga ulanish yuritilmoqda: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ulandi.');

        const wb = xlsx.readFile(EXCEL_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1);

        const season = await Season.findOne({ isActive: true });
        if (!season) {
            console.error('❌ Faol mavsum topilmadi!');
            process.exit(1);
        }

        let stats = {
            updatedIn280k: 0,
            alreadyUsed: 0,
            notFoundInDB: 0,
            usageCreated: 0
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;

            const telegramId = parseInt(row[4]);
            const code = (row[5] && row[5] !== '-' && row[5] !== 'ВУВУВ') ? String(row[5]).trim().toUpperCase() : null;
            const name = String(row[0] || '').trim() || 'Foydalanuvchi';
            const phone = String(row[1] || '').replace(/[^0-9]/g, '');
            const normalizedPhone = phone.startsWith('998') ? '+' + phone : '+998' + phone;

            if (!telegramId || !code) continue;

            // 1. Userni tekshirish/yaratish
            let user = await User.findOne({ telegramId });
            if (!user) {
                user = await User.create({ telegramId, name, phone: normalizedPhone, region: String(row[2] || ''), registeredAt: new Date() });
            }

            // 2. MAJBURIY UPDATE (isUsed: true)
            // findOne + save o'rniga to'g'ridan-to'g'ri updateOne dan foydalanamiz
            const updateResult = await PromoCode.updateOne(
                { code: code, $or: [{ isUsed: false }, { usedBy: { $exists: false } }, { usedBy: null }] },
                {
                    $set: {
                        isUsed: true,
                        usedBy: telegramId,
                        usedByName: name,
                        usedByPhone: normalizedPhone,
                        usedAt: new Date()
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                stats.updatedIn280k++;
            } else {
                // Agar o'zgarmagan bo'lsa, yoki allaqachon used yoki umuman yo'q
                const checkExist = await PromoCode.findOne({ code });
                if (checkExist) stats.alreadyUsed++;
                else stats.notFoundInDB++;
            }

            // 3. Usage (Tarix) - agar yo'q bo'lsa
            const usage = await PromoCodeUsage.findOne({ telegramId, promoCode: code });
            if (!usage) {
                await PromoCodeUsage.create({
                    telegramId,
                    seasonId: season._id,
                    userName: name,
                    userPhone: normalizedPhone,
                    userRegion: String(row[2] || 'Noma\'lum'),
                    promoCode: code,
                    points: 10,
                    usedAt: new Date()
                });
                
                user.totalPoints = (user.totalPoints || 0) + 10;
                await user.save();
                stats.usageCreated++;
            }

            if ((i + 1) % 50 === 0) console.log(`🔄 Tekshirilmoqda: ${i + 1}/${rows.length}...`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('🏁 YAKUNIY NATIJA (AGRESSIVE RESTORE)');
        console.log('='.repeat(50));
        console.log(`🎟  "Used" deb yangilangan kodlar:     ${stats.updatedIn280k}`);
        console.log(`🎟  Allaqachon "Used" bo'lgan kodlar:   ${stats.alreadyUsed}`);
        console.log(`🎟  Bazada topilmagan kodlar:          ${stats.notFoundInDB}`);
        console.log(`📝 Tarixga (Usage) yangi qo'shilgan:   ${stats.usageCreated}`);
        console.log('='.repeat(50));

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Xatolik:', err);
        process.exit(1);
    }
}

aggressiveRestore();
