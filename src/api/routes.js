const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const { authMiddleware: jwtAuth } = require("../middleware/auth");
const { sendBroadcast } = require("../utils/broadcastNew");
const XLSX = require("xlsx");

// POST: Yangi promo kod(lar) qo'shish
router.post("/promo-codes", jwtAuth, async (req, res) => {
  try {
    const { codes, description, points } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kodlar array ko'rinishida bo'lishi kerak",
      });
    }

    const validCodes = [];
    const errors = [];

    for (const code of codes) {
      const upperCode = code.trim().toUpperCase();

      const exists = await PromoCode.findOne({ code: upperCode });
      if (exists) {
        errors.push({ code: upperCode, error: "Allaqachon mavjud" });
        continue;
      }

      validCodes.push({
        code: upperCode,
        description: description || "",
        points: parseInt(points) || 0,
      });
    }

    if (validCodes.length > 0) {
      await PromoCode.insertMany(validCodes);
    }

    res.json({
      success: true,
      message: `${validCodes.length} ta kod qo'shildi`,
      added: validCodes.length,
      errors: errors,
    });
  } catch (error) {
    console.error("Promo kod qo'shishda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Barcha promo kodlarni olish
router.get("/promo-codes", jwtAuth, async (req, res) => {
  try {
    const { used, limit = 100, skip = 0, search } = req.query;

    const filter = {};
    if (used !== undefined) {
      filter.isUsed = used === "true";
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { code: searchRegex },
        { description: searchRegex },
        { usedByName: searchRegex },
        { usedByPhone: searchRegex },
      ];
    }

    const codes = await PromoCode.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await PromoCode.countDocuments(filter);

    res.json({
      success: true,
      total,
      count: codes.length,
      data: codes,
    });
  } catch (error) {
    console.error("Promo kodlarni olishda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// DELETE: Promo kodni o'chirish
router.delete("/promo-codes/:code", jwtAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();

    // Find the code first
    const promoCode = await PromoCode.findOne({ code: upperCode });

    if (!promoCode) {
      return res.status(404).json({ success: false, message: "Kod topilmadi" });
    }

    // If code was used, deduct points and remove usage record
    if (promoCode.isUsed && promoCode.usedBy) {
      const User = require("../models/User");
      const PromoCodeUsage = require("../models/PromoCodeUsage");

      // 1. Deduct points from user
      const user = await User.findOne({ telegramId: promoCode.usedBy });
      if (user) {
        const points = promoCode.points || 0;
        user.totalPoints = Math.max(0, (user.totalPoints || 0) - points);
        if (user.usedPromoCode === upperCode) {
          user.usedPromoCode = null; // Clear if it was the last used
        }
        await user.save();
      }

      // 2. Delete usage record
      await PromoCodeUsage.deleteOne({
        promoCode: upperCode,
        telegramId: promoCode.usedBy,
      });
    }

    // Delete the promo code
    await PromoCode.deleteOne({ code: upperCode });

    res.json({
      success: true,
      message: "Kod o'chirildi va ballar qaytarildi",
    });
  } catch (error) {
    console.error("Promo kod o'chirishda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// PUT: Bulk update promo codes
router.put("/promo-codes/bulk", jwtAuth, async (req, res) => {
  try {
    const { filter: clientFilter, points } = req.body;

    // Reconstruct filter from client params
    const filter = {};
    if (clientFilter.used !== undefined && clientFilter.used !== "all") {
      filter.isUsed = clientFilter.used === "used";
    }
    if (clientFilter.seasonId && clientFilter.seasonId !== "all") {
      filter.seasonId = clientFilter.seasonId;
    }
    if (clientFilter.search) {
      const searchRegex = new RegExp(clientFilter.search.trim(), "i");
      filter.$or = [
        { code: searchRegex },
        { description: searchRegex },
        { usedByName: searchRegex },
        { usedByPhone: searchRegex },
      ];
    }

    const newPoints = parseInt(points);
    if (isNaN(newPoints)) {
      return res
        .status(400)
        .json({ success: false, message: "Ball noto'g'ri kiritildi" });
    }

    const codesToUpdate = await PromoCode.find(filter);

    let updatedCount = 0;
    const User = require("../models/User");
    const PromoCodeUsage = require("../models/PromoCodeUsage");

    for (const code of codesToUpdate) {
      const oldPoints = code.points || 0;

      if (oldPoints !== newPoints) {
        code.points = newPoints;
        await code.save();

        if (code.isUsed && code.usedBy) {
          const diff = newPoints - oldPoints;
          await User.updateOne(
            { telegramId: code.usedBy },
            { $inc: { totalPoints: diff } }
          );
          await PromoCodeUsage.updateOne(
            { promoCode: code.code, telegramId: code.usedBy },
            { $set: { points: newPoints } }
          );
        }
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `${updatedCount} ta kod yangilandi`,
      totalFound: codesToUpdate.length,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// PUT: Promo kodni tahrirlash
router.put("/promo-codes/:code", jwtAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const { description, points } = req.body;
    const upperCode = code.toUpperCase();

    const promoCode = await PromoCode.findOne({ code: upperCode });

    if (!promoCode) {
      return res.status(404).json({ success: false, message: "Kod topilmadi" });
    }

    const oldPoints = promoCode.points || 0;
    const newPoints = parseInt(points) || 0;

    // Update fields
    if (description !== undefined) promoCode.description = description;
    if (points !== undefined) promoCode.points = newPoints;

    await promoCode.save();

    // If points changed and code is used, update user points
    if (promoCode.isUsed && promoCode.usedBy && oldPoints !== newPoints) {
      const User = require("../models/User");
      const PromoCodeUsage = require("../models/PromoCodeUsage");

      const diff = newPoints - oldPoints;

      // Update User
      await User.updateOne(
        { telegramId: promoCode.usedBy },
        { $inc: { totalPoints: diff } }
      );

      // Update Usage record
      await PromoCodeUsage.updateOne(
        { promoCode: upperCode, telegramId: promoCode.usedBy },
        { $set: { points: newPoints } }
      );
    }

    res.json({
      success: true,
      message: "Kod yangilandi",
      data: promoCode,
    });
  } catch (error) {
    console.error("Promo kod tahrirlashda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Barcha foydalanuvchilarni olish (viloyat filteri bilan)
router.get("/users", jwtAuth, async (req, res) => {
  try {
    const { region, limit = 100, skip = 0 } = req.query;

    const filter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        filter.region = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        filter.region = region;
      }
    }

    const users = await User.find(filter)
      .sort({ registeredAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      total,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Foydalanuvchilarni olishda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Statistika
router.get("/stats", jwtAuth, async (req, res) => {
  try {
    const totalCodes = await PromoCode.countDocuments();
    const usedCodes = await PromoCode.countDocuments({ isUsed: true });
    const unusedCodes = await PromoCode.countDocuments({ isUsed: false });
    const totalUsers = await User.countDocuments();

    // Viloyat bo'yicha statistika
    const usersByRegionRaw = await User.aggregate([
      { $group: { _id: "$region", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Merge Toshkent shahri and Toshkent viloyati in stats
    const usersByRegionMap = new Map();
    usersByRegionRaw.forEach((item) => {
      let regionName = item._id || "Noma'lum";
      if (regionName === "Toshkent shahri" || regionName === "Toshkent viloyati") {
        regionName = "Toshkent";
      }
      usersByRegionMap.set(
        regionName,
        (usersByRegionMap.get(regionName) || 0) + item.count
      );
    });

    const usersByRegion = Array.from(usersByRegionMap.entries())
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    // Eng ko'p kod ishlatgan userlar (top 10)
    const topUsers = await User.aggregate([
      {
        $lookup: {
          from: "promocodes",
          localField: "telegramId",
          foreignField: "usedBy",
          as: "codes",
        },
      },
      {
        $project: {
          name: 1,
          phone: 1,
          region: 1,
          city: 1,
          telegramId: 1,
          codeCount: { $size: "$codes" },
        },
      },
      { $match: { codeCount: { $gt: 0 } } },
      { $sort: { codeCount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        totalCodes,
        usedCodes,
        unusedCodes,
        totalUsers,
        usagePercentage:
          totalCodes > 0 ? ((usedCodes / totalCodes) * 100).toFixed(2) : 0,
        usersByRegion,
        topUsers,
      },
    });
  } catch (error) {
    console.error("Statistika olishda xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Excel export - Promo kodlar (.xlsx)
router.get("/export/codes", jwtAuth, async (req, res) => {
  try {
    const { used } = req.query;
    const filter = used !== undefined ? { isUsed: used === "true" } : {};

    const codes = await PromoCode.find(filter).sort({ createdAt: -1 });

    // XLSX uchun data tayyorlash
    const data = codes.map((code) => ({
      Kod: code.code,
      Tavsif: code.description || "-",
      Holat: code.isUsed ? "Ishlatilgan" : "Ishlatilmagan",
      "Ishlatilgan Sana": code.usedAt
        ? new Date(code.usedAt).toLocaleString("uz-UZ")
        : "-",
      Foydalanuvchi: code.usedByName || "-",
      Telefon: code.usedByPhone || "-",
    }));

    // Workbook yaratish
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ustun kengliklarini sozlash
    ws["!cols"] = [
      { wch: 15 }, // Kod
      { wch: 30 }, // Tavsif
      { wch: 15 }, // Holat
      { wch: 20 }, // Sana
      { wch: 25 }, // Foydalanuvchi
      { wch: 15 }, // Telefon
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Promo Kodlar");

    // Buffer'ga yozish
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=promocodes.xlsx"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Excel export - Foydalanuvchilar (.xlsx)
router.get("/export/users", jwtAuth, async (req, res) => {
  try {
    const { region } = req.query;
    let filter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        filter.region = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        filter.region = region;
      }
    }
    const users = await User.find(filter).sort({ registeredAt: -1 });

    // XLSX uchun data tayyorlash
    const data = users.map((user) => ({
      Ism: user.name,
      Telefon: user.phone,
      Viloyat: user.region || "-",
      Shahar: user.city || "-",
      Username: user.username || "-",
      "Telegram ID": user.telegramId,
      "Promo Kod": user.usedPromoCode,
      "Ro'yxatdan o'tgan": new Date(user.registeredAt).toLocaleString("uz-UZ"),
    }));

    // Workbook yaratish
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ustun kengliklarini sozlash
    ws["!cols"] = [
      { wch: 25 }, // Ism
      { wch: 15 }, // Telefon
      { wch: 20 }, // Viloyat
      { wch: 20 }, // Shahar
      { wch: 15 }, // Username
      { wch: 15 }, // Telegram ID
      { wch: 15 }, // Promo Kod
      { wch: 20 }, // Sana
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Foydalanuvchilar");

    // Buffer'ga yozish
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Random user tanlash// POST: Random user tanlash
router.post("/random-winner", jwtAuth, async (req, res) => {
  try {
    const { region, count = 1 } = req.body;

    const filter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        filter.region = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        filter.region = region;
      }
    }

    const users = await User.find(filter);

    if (users.length === 0) {
      return res.json({
        success: false,
        message: "Foydalanuvchilar topilmadi",
      });
    }

    // Random tanlash
    const winners = [];
    const usersCopy = [...users];
    const selectCount = Math.min(count, usersCopy.length);

    for (let i = 0; i < selectCount; i++) {
      const randomIndex = Math.floor(Math.random() * usersCopy.length);
      winners.push(usersCopy[randomIndex]);
      usersCopy.splice(randomIndex, 1);
    }

    res.json({
      success: true,
      data: winners,
      total: users.length,
    });
  } catch (error) {
    console.error("Random winner xatolik:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Yangilik yuborish
router.post("/broadcast", jwtAuth, async (req, res) => {
  try {
    const { message, region } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Xabar matni bo'sh" });
    }

    // Bot instance'ni olish
    const { bot } = require("../nerobot");

    // Darhol javob qaytarish
    res.json({
      success: true,
      message: "Xabar yuborish boshlandi",
    });

    // Background'da yuborish
    try {
      const results = await sendBroadcast(bot, message, region);

      // Adminga tugaganini bildirish
      const adminIds = process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(",")
        : [];
      if (adminIds.length > 0) {
        const adminMessage = `
📊 *Broadcast Tugadi!*

✅ Muvaffaqiyatli: ${results.success}
❌ Xato: ${results.failed}
🚫 Bloklagan: ${results.blocked}
📈 Jami: ${results.total}

Viloyat: ${region === "all" ? "Barcha" : region}
Vaqt: ${new Date().toLocaleString("uz-UZ")}
        `;

        for (const adminId of adminIds) {
          try {
            await bot.telegram.sendMessage(
              parseInt(adminId.trim()),
              adminMessage,
              {
                parse_mode: "Markdown",
              }
            );
          } catch (err) {
            console.error("Adminga xabar yuborishda xatolik:", err.message);
          }
        }
      }

      console.log("✅ Broadcast muvaffaqiyatli tugadi");
    } catch (broadcastError) {
      console.error("❌ Broadcast xatolik:", broadcastError);
    }
  } catch (error) {
    console.error("Broadcast endpoint xatolik:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server xatosi" });
    }
  }
});

module.exports = router;
