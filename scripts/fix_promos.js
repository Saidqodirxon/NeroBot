/**
 * NeroBot PromoCode Fix & Restore Script
 * Excel'dagi barcha kodlarni PromoCode jadvaliga "ishlatilgan" qilib qo'shadi.
 */
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Modellarni yuklash
const User = require('../src/models/User');
const PromoCode = require('../src/models/PromoCode');
const PromoCodeUsage = require('../src/models/PromoCodeUsage');
const Season = require('../src/models/Season');

const MONGODB_URI = 'mongodb://localhost:27017/nero-bonus';
const EXCEL_FILE = path.join(__dirname, '..', 'НЕРО_база_испоьзовнных_кадов_до_27_03.xlsx');

async function fixRestore() {
    try {
        console.log('🚀 Promokodlarni va foydalanuvchilarni to\'liq tiklash boshlandi...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ulandi.');

        const wb = xlsx.readFile(EXCEL_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1);

        let season = await Season.findOne({ isActive: true });
        if (!season) {
            season = await Season.create({ name: '1-Mavsum', isActive: true, startDate: new Date('2025-01-01') });
        }

        let stats = { codesUpdated: 0, codesNew: 0, usagesFix: 0, usersFix: 0 };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;

            const name = String(row[0] || '').trim() || 'Foydalanuvchi';
            const phone = String(row[1] || '').replace(/[^0-9]/g, '');
            const region = String(row[2] || '').trim();
            const telegramId = parseInt(row[4]);
            const code = (row[5] && row[5] !== '-' && row[5] !== 'ВУВУВ') ? String(row[5]).trim().toUpperCase() : null;

            if (!telegramId || isNaN(telegramId)) continue;
            
            const normalizedPhone = phone.startsWith('998') ? '+' + phone : '+998' + phone;

            // 1. Userni tekshirish va tiklash
            let user = await User.findOne({ telegramId });
            if (!user) {
                user = await User.create({
                    telegramId,
                    name,
                    phone: normalizedPhone,
                    region: region || 'Noma\'lum',
                    registeredAt: new Date()
                });
                stats.usersFix++;
            }

            // 2. Promokod bilan ishlash
            if (code) {
                // PromoCode jadvalida kodni qidiramiz
                let promoDoc = await PromoCode.findOne({ code });

                if (!promoDoc) {
                    // Kod bazada umuman yo'q bo'lsa - yangi "ishlatilgan" kod yaratamiz
                    await PromoCode.create({
                        code,
                        seasonId: season._id,
                        points: 10,
                        isUsed: true,
                        usedBy: telegramId,
                        usedByName: name,
                        usedByPhone: normalizedPhone,
                        usedAt: new Date()
                    });
                    stats.codesNew++;
                } else if (!promoDoc.isUsed) {
                    // Kod bor, lekin ishlatilmagan bo'lsa - uni "ishlatilgan" deb yangilaymiz
                    promoDoc.isUsed = true;
                    promoDoc.usedBy = telegramId;
                    promoDoc.usedByName = name;
                    promoDoc.usedByPhone = normalizedPhone;
                    promoDoc.usedAt = new Date();
                    await promoDoc.save();
                    stats.codesUpdated++;
                }

                // 3. PromoCodeUsage (Tarix) jadvalini tekshirish
                const usage = await PromoCodeUsage.findOne({ telegramId, promoCode: code });
                if (!usage) {
                    await PromoCodeUsage.create({
                        telegramId,
                        seasonId: season._id,
                        userName: name,
                        userPhone: normalizedPhone,
                        userRegion: region || 'Noma\'lum',
                        promoCode: code,
                        points: 10,
                        usedAt: new Date()
                    });
                    
                    // User ballarini Excel dagi kod uchun qo'shib qo'yamiz
                    user.totalPoints = (user.totalPoints || 0) + 10;
                    await user.save();
                    stats.usagesFix++;
                }
            }

            if ((i + 1) % 50 === 0) console.log(`🔄 Jarayon: ${i + 1}/${rows.length}...`);
        }

        console.log('\n✅ NATIJA:');
        console.log(`👤 Tiklangan userlar: ${stats.usersFix}`);
        console.log(`🎟  Yangi qo'shilgan kodlar: ${stats.codesNew}`);
        console.log(`🎟  Ishlatilgan deb belgilangan kodlar: ${stats.codesUpdated}`);
        console.log(`📝 Tarixga (Usage) yozilgan kodlar: ${stats.usagesFix}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Xatolik:', err);
        process.exit(1);
    }
}

fixRestore();
