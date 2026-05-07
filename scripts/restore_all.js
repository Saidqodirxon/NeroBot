/**
 * NeroBot Unified Restore Script
 * Barcha foydalanuvchilar va promokodlarni Excel dan bittada tiklaydi.
 */
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');

// Modellarni yuklash (Absolute path bilan)
const User = require('../src/models/User');
const PromoCode = require('../src/models/PromoCode');
const PromoCodeUsage = require('../src/models/PromoCodeUsage');
const Season = require('../src/models/Season');

const MONGODB_URI = 'mongodb://localhost:27017/nero-bonus';
const EXCEL_FILE = path.join(__dirname, '..', 'НЕРО_база_испоьзовнных_кадов_до_27_03.xlsx');

async function startRestore() {
    try {
        console.log('🚀 Birlashgan tiklash jarayoni boshlandi...');
        console.log(`📡 MongoDB ulanish: ${MONGODB_URI}`);
        
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ga ulanish o\'rnatildi.\n');

        // Excel ni o'qish
        console.log(`📁 Faylni o'qish: ${path.basename(EXCEL_FILE)}`);
        const wb = xlsx.readFile(EXCEL_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1);
        console.log(`📊 Faylda jami ${rows.length} ta yozuv topildi.\n`);

        // Aktive mavsumni topish yoki yaratish
        let season = await Season.findOne({ isActive: true });
        if (!season) {
            console.log('📅 Mavsum topilmadi, yangi ("1-Mavsum") yaratilmoqda...');
            season = await Season.create({
                name: '1-Mavsum (Tarixiy)',
                isActive: true,
                startDate: new Date('2025-01-01')
            });
        }

        const stats = {
            usersSaved: 0,
            usersSkipped: 0,
            usagesSaved: 0,
            usagesSkipped: 0,
            codesSaved: 0,
            codesSkipped: 0,
            errors: 0
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;

            try {
                const name = String(row[0] || '').trim();
                const rawPhone = String(row[1] || '').replace(/[^0-9]/g, '');
                const region = String(row[2] || '').trim();
                const username = (row[3] && row[3] !== '-') ? String(row[3]).trim() : null;
                const telegramId = parseInt(row[4]);
                const code = (row[5] && row[5] !== '-' && row[5] !== 'ВУВУВ') ? String(row[5]).trim().toUpperCase() : null;

                if (!telegramId || isNaN(telegramId)) {
                    console.log(`⚠️ Qator ${i+2}: Telegram ID xato, o'tkazib yuborildi.`);
                    continue;
                }

                // 1. Foydalanuvchini tiklash
                let user = await User.findOne({ telegramId });
                const phone = rawPhone ? (rawPhone.startsWith('998') ? '+' + rawPhone : '+998' + rawPhone) : '+998000000000';

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
                    stats.usersSaved++;
                } else {
                    stats.usersSkipped++;
                }

                // 2. Promokod va uning ishlatilishini tiklash
                if (code) {
                    // Usage (ishlatilish tarixi) ni tekshirish
                    const existingUsage = await PromoCodeUsage.findOne({ telegramId, promoCode: code });
                    if (!existingUsage) {
                        try {
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
                            
                            // Userni ballarini yangilash
                            user.totalPoints += 10;
                            await user.save();
                            stats.usagesSaved++;

                            // Promokodni o'zini ham "ishlatilgan" deb bazaga qo'shib qo'yish
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
                                stats.codesSaved++;
                            } else {
                                stats.codesSkipped++;
                            }
                        } catch (usageErr) {
                            if (usageErr.code === 11000) stats.usagesSkipped++;
                            else throw usageErr;
                        }
                    } else {
                        stats.usagesSkipped++;
                    }
                }

                // Progress ko'rsatish
                if ((i + 1) % 100 === 0) {
                    console.log(`🔄 Ishlanmoqda: ${i + 1}/${rows.length} qator yakunlandi...`);
                }

            } catch (rowErr) {
                if (rowErr.code === 11000) {
                    stats.errors++;
                } else {
                    console.error(`❌ Qator ${i+2} da xatolik:`, rowErr.message);
                    stats.errors++;
                }
            }
        }

        console.log('\n' + '='.repeat(45));
        console.log('✅ TIKLASH NATIJALARI:');
        console.log('='.repeat(45));
        console.log(`👤 Foydalanuvchilar:  +${stats.usersSaved} yangi (${stats.usersSkipped} mavjud)`);
        console.log(`📝 Kod ishlatilgan:    +${stats.usagesSaved} yangi (${stats.usagesSkipped} duplikat)`);
        console.log(`🎟  Promokodlar:       +${stats.codesSaved} yangi (${stats.codesSkipped} mavjud)`);
        console.log(`⚠️  Xatolik/Conflict:  ${stats.errors}`);
        console.log('='.repeat(45));
        
        const totalUsersInDB = await User.countDocuments();
        console.log(`📊 Bazadagi umumiy foydalanuvchilar: ${totalUsersInDB}`);
        console.log('='.repeat(45));

        await mongoose.disconnect();
        console.log('\n✅ Ish yakunlandi. MongoDB dan uzildi.');
        process.exit(0);

    } catch (err) {
        console.error('❌ GLOBAL XATOLIK:', err);
        process.exit(1);
    }
}

startRestore();
