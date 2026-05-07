/**
 * NeroBot DB Diagnostic Script
 * Nega kodlar tiklanmayotganini aniqlash uchun.
 */
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");

const User = require("../src/models/User");
const PromoCode = require("../src/models/PromoCode");
const PromoCodeUsage = require("../src/models/PromoCodeUsage");

const MONGODB_URI = "mongodb://localhost:27017/nerobot";
const EXCEL_FILE = path.join(
  __dirname,
  "..",
  "НЕРО_база_испоьзовнных_кадов_до_27_03.xlsx"
);

async function diagnose() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB ulandi.\n");

    // 1. Umumiy statistika
    const totalPromos = await PromoCode.countDocuments();
    const usedPromos = await PromoCode.countDocuments({ isUsed: true });
    const totalUsers = await User.countDocuments();
    const totalUsages = await PromoCodeUsage.countDocuments();

    console.log("--- UMUMIY STATISTIKA ---");
    console.log(`Jami promokodlar (280k?): ${totalPromos}`);
    console.log(`Ishlatilgan promokodlar: ${usedPromos}`);
    console.log(`Jami foydalanuvchilar:    ${totalUsers}`);
    console.log(`Jami Usage yozuvlari:     ${totalUsages}\n`);

    // 2. Excel dan namunalar olib qidirish
    const wb = xlsx.readFile(EXCEL_FILE);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const rows = data.slice(1, 11); // Birinchi 10 ta qator

    console.log("--- EXCEL VS BAZA TEKSHIRUVI (NAMUNA) ---");
    for (const row of rows) {
      const excelCode = String(row[5] || "")
        .trim()
        .toUpperCase();
      if (!excelCode || excelCode === "ВУВУВ") continue;

      // Bazadan qidirish (Exact match)
      const dbMatch = await PromoCode.findOne({ code: excelCode });

      // Bo'sh joylarni olib tashlab qidirish (Regex bilan)
      const dbMatchRegex = await PromoCode.findOne({
        code: new RegExp("^" + excelCode.trim() + "$", "i"),
      });

      console.log(`Kod: [${excelCode}]`);
      console.log(
        `   - Exact match: ${dbMatch ? "✅ TOPILDI (isUsed: " + dbMatch.isUsed + ")" : "❌ TOPILMADI"}`
      );
      if (!dbMatch && dbMatchRegex) {
        console.log(
          `   - Regex match: ✅ TOPILDI (Demak bazadagi kodda bo'sh joylar bor!)`
        );
      }
    }

    // 3. Bazadagi har qanday 5 ta kodni ko'rish (Formatini bilish uchun)
    const sampleCodes = await PromoCode.find().limit(5);
    console.log("\n--- BAZADAGI ASLIY KODLAR FORMATI ---");
    sampleCodes.forEach((p) => console.log(`[${p.code}]`));

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Xatolik:", err);
  }
}

diagnose();
