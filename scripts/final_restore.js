/**
 * Excel fayldan foydalanuvchilarni MUKAMMAL tiklash skripti
 * Conflict bo'lsa o'tkazib yuboradi va davom etadi.
 */
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Modellarni yuklash
const User = require('../src/models/User');
const PromoCode = require('../src/models/PromoCode');
const PromoCodeUsage = require('../src/models/PromoCodeUsage');
const Season = require('../src/models/Season');

const MONGODB_URI = 'mongodb://localhost:27017/nerobot';
const EXCEL_FILE = path.join(__dirname, '..', 'НЕРО_база_испоьзовнных_кадов_до_27_03.xlsx');

async function restore() {
    try {
        console.log('🚀 Mukammal tiklash jarayoni boshlandi...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ulandi.');

        const wb = xlsx.readFile(EXCEL_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        const rows = data.slice(1); // Sarlavhani olib tashlash
        console.log(`📊 Faylda jami ${rows.length} qator ma'lumot bor.\n`);

        let season = await Season.findOne({ isActive: true });
        if (!season) {
            season = await Season.create({
                name: '1-Mavsum (Excel)',
                isActive: true,
                startDate: new Date('2025-01-01')
            });
        }

        let stats = { newUsers: 0, skippedUsers: 0, newCodes: 0, skippedCodes: 0, errors: 0 };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;

            const name = String(row[0] || '').trim();
            const phoneStr = String(row[1] || '').replace(/[^0-9]/g, '');
            const region = String(row[2] || '').trim();
            const username = row[3] === '-' ? null : String(row[3]).trim();
            const telegramId = parseInt(row[4]);
            const code = row[5] ? String(row[5]).trim().toUpperCase() : null;

            if (!telegramId || isNaN(telegramId)) {
                console.log(`⚠️  ${i+1}-qator: Telegram ID noto'g'ri, o'tkazib yuborildi.`);
                continue;
            }

            try {
                // 1. Userni yaratish yoki topish
                let user = await User.findOne({ telegramId });
                const phone = phoneStr ? (phoneStr.startsWith('998') ? '+' + phoneStr : '+998' + phoneStr) : '+998000000000';

                if (!user) {
                    user = await User.create({
                        telegramId,
                        username,
                        name: name || 'Foydalanuvchi',
                        firstName: name,
                        phone,
                        region: region || 'Noma\'lum',
                        totalPoints: 0,
                        registeredAt: new Date()
                    });
                    stats.newUsers++;
                } else {
                    stats.skippedUsers++;
                }

                // 2. Promokodni ishlash (faqat code mavjud bo'lsa)
                if (code && code !== 'ВУВУВ' && code !== '-') {
                    // Usage tekshirish
                    const existingUsage = await PromoCodeUsage.findOne({ telegramId, promoCode: code });
                    
                    if (!existingUsage) {
                        // Usage yozish (agar conflict bo'lsa catch'ga tushadi)
                        await PromoCodeUsage.create({
                            telegramId,
                            seasonId: season._id,
                            userName: user.name,
                            userPhone: user.phone,
                            userRegion: user.region,
                            promoCode: code,
                            points: 10,
                            usedAt: new Date()
                        });

                        // User ballarni yangilash
                        user.totalPoints += 10;
                        await user.save();

                        // PromoCode bazaga qo'shish (agar yo'q bo'lsa)
                        const pc = await PromoCode.findOne({ code });
                        if (!pc) {
                            await PromoCode.create({
                                code,
                                seasonId: season._id,
                                points: 10,
                                isUsed: true,
                                usedBy: telegramId,
                                usedByName: user.name,
                                usedByPhone: user.phone,
                                usedAt: new Date()
                            });
                            stats.newCodes++;
                        } else {
                            stats.skippedCodes++;
                        }
                    } else {
                        stats.skippedCodes++;
                    }
                }
            } catch (err) {
                if (err.code === 11000) {
                    // Duplicate key error (conflict) - shunchaki o'tkazib yuboramiz
                    stats.errors++;
                } else {
                    console.error(`❌ Xatolik qatorda ${i+1}:`, err.message);
                    stats.errors++;
                }
            }

            // Har 50 ta qatorda progress ko'rsatish
            if ((i + 1) % 50 === 0) console.log(`🔄 Progress: ${i+1}/${rows.length} qator o'rganildi...`);
        }

        console.log('\n' + '='.repeat(40));
        console.log('✅ TIKLASH YAKUNLANDI');
        console.log('='.repeat(40));
        console.log(`👤 Yangi userlar: ${stats.newUsers}`);
        console.log(`👤 Mavjud userlar (skipped): ${stats.skippedUsers}`);
        console.log(`🎟  Yangi kodlar: ${stats.newCodes}`);
        console.log(`🎟  Mavjud kodlar (skipped): ${stats.skippedCodes}`);
        console.log(`⚠️  Conflictlar/Xatolar: ${stats.errors}`);
        console.log(`📊 Umumiy userlar bazada: ${await User.countDocuments()}`);
        console.log('='.repeat(40));

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Kutilmagan global xatolik:', error);
        process.exit(1);
    }
}

restore();
