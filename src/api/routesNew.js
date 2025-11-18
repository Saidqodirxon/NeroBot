const express = require("express");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const Season = require("../models/Season");
const { authMiddleware: jwtAuth } = require("../middleware/auth");
const { sendBroadcast } = require("../utils/broadcastNew");
const XLSX = require("xlsx");

// ==================== SEASON MANAGEMENT ====================

// GET: Get all seasons
router.get("/seasons", jwtAuth, async (req, res) => {
  try {
    const seasons = await Season.find().sort({ startDate: -1 });
    res.json({
      success: true,
      data: seasons,
    });
  } catch (error) {
    console.error("Get seasons error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Create new season
router.post("/seasons", jwtAuth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, isActive } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Mavsum nomi va boshlanish sanasi talab qilinadi",
      });
    }

    const season = await Season.create({
      name,
      description: description || "",
      startDate,
      endDate: endDate || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.json({
      success: true,
      message: "Mavsum yaratildi",
      data: season,
    });
  } catch (error) {
    console.error("Create season error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// PUT: Update season
router.put("/seasons/:id", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, isActive } = req.body;

    const season = await Season.findByIdAndUpdate(
      id,
      { name, description, startDate, endDate, isActive },
      { new: true }
    );

    if (!season) {
      return res
        .status(404)
        .json({ success: false, message: "Mavsum topilmadi" });
    }

    res.json({
      success: true,
      message: "Mavsum yangilandi",
      data: season,
    });
  } catch (error) {
    console.error("Update season error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// DELETE: Delete season and all related data
router.delete("/seasons/:id", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all promo codes for this season
    await PromoCode.deleteMany({ seasonId: id });

    // Delete all usage records for this season
    await PromoCodeUsage.deleteMany({ seasonId: id });

    // Delete the season
    const season = await Season.findByIdAndDelete(id);

    if (!season) {
      return res
        .status(404)
        .json({ success: false, message: "Mavsum topilmadi" });
    }

    res.json({
      success: true,
      message: "Mavsum va barcha bog'liq ma'lumotlar o'chirildi",
    });
  } catch (error) {
    console.error("Delete season error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== PROMO CODE MANAGEMENT ====================

// POST: Add promo code(s) with season
router.post("/promo-codes", jwtAuth, async (req, res) => {
  try {
    const { codes, description, seasonId } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kodlar array ko'rinishida bo'lishi kerak",
      });
    }

    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: "Mavsum tanlanishi shart",
      });
    }

    // Verify season exists
    const season = await Season.findById(seasonId);
    if (!season) {
      return res.status(400).json({
        success: false,
        message: "Mavsum topilmadi",
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
        seasonId: seasonId,
        description: description || "",
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
    console.error("Add promo codes error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Get promo codes with filters
router.get("/promo-codes", jwtAuth, async (req, res) => {
  try {
    const { used, seasonId, limit = 100, skip = 0 } = req.query;

    const filter = {};
    if (used !== undefined) {
      filter.isUsed = used === "true";
    }
    if (seasonId && seasonId !== "all") {
      filter.seasonId = seasonId;
    }

    const codes = await PromoCode.find(filter)
      .populate("seasonId")
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
    console.error("Get promo codes error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// DELETE: Delete promo code
router.delete("/promo-codes/:code", jwtAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const result = await PromoCode.deleteOne({ code: code.toUpperCase() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Kod topilmadi" });
    }

    res.json({
      success: true,
      message: "Kod o'chirildi",
    });
  } catch (error) {
    console.error("Delete promo code error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== USER MANAGEMENT ====================

// GET: Get users with filters
router.get("/users", jwtAuth, async (req, res) => {
  try {
    const { region, limit = 100, skip = 0 } = req.query;

    const filter = {};
    if (region && region !== "all") {
      filter.region = region;
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
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Get single user details with usage history
router.get("/users/:telegramId", jwtAuth, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { seasonId } = req.query;

    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    // Get usage history
    const usageFilter = { telegramId: parseInt(telegramId) };
    if (seasonId && seasonId !== "all") {
      usageFilter.seasonId = seasonId;
    }

    const usageHistory = await PromoCodeUsage.find(usageFilter)
      .populate("seasonId")
      .sort({ usedAt: -1 });

    res.json({
      success: true,
      data: {
        user,
        usageHistory,
        totalCodes: usageHistory.length,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== STATISTICS ====================

// GET: Default statistics (for admin dashboard)
router.get("/stats", jwtAuth, async (req, res) => {
  try {
    const { seasonId } = req.query;

    // Base filters
    const codeFilter = {};
    const usageFilter = {};
    if (seasonId && seasonId !== "all") {
      codeFilter.seasonId = seasonId;
      usageFilter.seasonId = seasonId;
    }

    // Basic counts
    const totalCodes = await PromoCode.countDocuments(codeFilter);
    const usedCodes = await PromoCode.countDocuments({
      ...codeFilter,
      isUsed: true,
    });
    const unusedCodes = await PromoCode.countDocuments({
      ...codeFilter,
      isUsed: false,
    });
    const totalUsers = await User.countDocuments();

    // Users by region
    const usersByRegion = await User.aggregate([
      { $group: { _id: "$region", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Top users by code usage (season filtered)
    const topUsers = await PromoCodeUsage.aggregate([
      ...(seasonId && seasonId !== "all"
        ? [
            {
              $match: {
                seasonId:
                  require("mongoose").Types.ObjectId.createFromHexString(
                    seasonId
                  ),
              },
            },
          ]
        : []),
      {
        $group: {
          _id: "$telegramId",
          count: { $sum: 1 },
          userName: { $first: "$userName" },
          userPhone: { $first: "$userPhone" },
          userRegion: { $first: "$userRegion" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Season stats
    const seasons = await Season.find().sort({ startDate: -1 });
    const seasonStats = await Promise.all(
      seasons.map(async (season) => {
        const codes = await PromoCode.countDocuments({ seasonId: season._id });
        const used = await PromoCode.countDocuments({
          seasonId: season._id,
          isUsed: true,
        });
        return {
          _id: season._id,
          name: season.name,
          totalCodes: codes,
          usedCodes: used,
          usagePercentage: codes > 0 ? ((used / codes) * 100).toFixed(2) : 0,
        };
      })
    );

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
        seasonStats,
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== EXPORT ====================

// GET: Export promo codes to Excel
router.get("/export/codes", jwtAuth, async (req, res) => {
  try {
    const { used, seasonId } = req.query;

    const filter = {};
    if (used !== undefined) {
      filter.isUsed = used === "true";
    }
    if (seasonId && seasonId !== "all") {
      filter.seasonId = seasonId;
    }

    const codes = await PromoCode.find(filter)
      .populate("seasonId")
      .sort({ createdAt: -1 });

    const data = codes.map((code) => ({
      Kod: code.code,
      Mavsum: code.seasonId?.name || "-",
      Tavsif: code.description || "-",
      Holat: code.isUsed ? "Ishlatilgan" : "Ishlatilmagan",
      "Ishlatilgan Sana": code.usedAt
        ? new Date(code.usedAt).toLocaleString("uz-UZ")
        : "-",
      Foydalanuvchi: code.usedByName || "-",
      Telefon: code.usedByPhone || "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 15 }, // Kod
      { wch: 20 }, // Mavsum
      { wch: 30 }, // Tavsif
      { wch: 15 }, // Holat
      { wch: 20 }, // Sana
      { wch: 25 }, // Foydalanuvchi
      { wch: 15 }, // Telefon
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Promo Kodlar");

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
    console.error("Export codes error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Export users to Excel
router.get("/export/users", jwtAuth, async (req, res) => {
  try {
    const { region } = req.query;
    const filter = region && region !== "all" ? { region } : {};
    const users = await User.find(filter).sort({ registeredAt: -1 });

    const data = users.map((user) => ({
      Ism: user.name,
      Telefon: user.phone,
      Viloyat: user.region || "-",
      Username: user.username || "-",
      "Telegram ID": user.telegramId,
      "Oxirgi Kod": user.usedPromoCode || "-",
      "Ro'yxatdan o'tgan": new Date(user.registeredAt).toLocaleString("uz-UZ"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 25 }, // Ism
      { wch: 15 }, // Telefon
      { wch: 20 }, // Viloyat
      { wch: 15 }, // Username
      { wch: 15 }, // Telegram ID
      { wch: 15 }, // Oxirgi Kod
      { wch: 20 }, // Sana
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Foydalanuvchilar");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Export user history to Excel (single user, filtered by season)
router.get("/export/user/:telegramId", jwtAuth, async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { seasonId } = req.query;

    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const usageFilter = { telegramId: parseInt(telegramId) };
    if (seasonId && seasonId !== "all") {
      usageFilter.seasonId = seasonId;
    }

    const usageHistory = await PromoCodeUsage.find(usageFilter)
      .populate("seasonId")
      .sort({ usedAt: -1 });

    const data = usageHistory.map((usage, index) => ({
      "#": index + 1,
      "Promo Kod": usage.promoCode,
      Mavsum: usage.seasonId?.name || "-",
      "Ishlatilgan Sana": new Date(usage.usedAt).toLocaleString("uz-UZ"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 5 }, // #
      { wch: 15 }, // Promo Kod
      { wch: 20 }, // Mavsum
      { wch: 20 }, // Sana
    ];

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `${user.name} - Kodlar`.substring(0, 31)
    );

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=user_${telegramId}_codes.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export user history error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== OTHER ====================

// POST: Random winner selection
router.post("/random-winner", jwtAuth, async (req, res) => {
  try {
    const { region, count = 1, seasonId } = req.body;

    // Filter for users who used codes
    const usageFilter = {};
    if (region && region !== "all") {
      usageFilter.userRegion = region;
    }
    if (seasonId && seasonId !== "all") {
      usageFilter.seasonId = seasonId;
    }

    // Get unique telegram IDs from PromoCodeUsage
    const usageRecords = await PromoCodeUsage.find(usageFilter).distinct(
      "telegramId"
    );

    if (usageRecords.length === 0) {
      return res.json({
        success: false,
        message: "Foydalanuvchilar topilmadi",
      });
    }

    // Get full user data
    const users = await User.find({ telegramId: { $in: usageRecords } });

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
    console.error("Random winner error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Broadcast message
router.post("/broadcast", jwtAuth, async (req, res) => {
  try {
    const { message, region } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Xabar matni bo'sh" });
    }

    const { bot } = require("../nerobot");

    // Admin guruhiga yuborish (har doim)
    if (process.env.ADMIN_GROUP_ID) {
      try {
        await bot.telegram.sendMessage(
          process.env.ADMIN_GROUP_ID,
          `📢 *YANGILIK*\n\n${message}\n\n_Viloyat: ${
            region === "all" ? "Barcha" : region
          }_`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error("Guruhga yuborishda xato:", err);
      }
    }

    res.json({
      success: true,
      message: "Xabar yuborish boshlandi",
    });

    try {
      const results = await sendBroadcast(bot, message, region);

      const adminMessage = `
📊 *Broadcast Tugadi!*

✅ Muvaffaqiyatli: ${results.success}
❌ Xato: ${results.failed}
🚫 Bloklagan: ${results.blocked}
📈 Jami: ${results.total}

Viloyat: ${region === "all" ? "Barcha" : region}
Vaqt: ${new Date().toLocaleString("uz-UZ")}
      `;

      // Admin guruhiga natija yuborish
      if (process.env.ADMIN_GROUP_ID) {
        try {
          await bot.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
            adminMessage,
            { parse_mode: "Markdown" }
          );
        } catch (err) {
          console.error("Guruhga natija yuborishda xato:", err);
        }
      }

      // Admin IDlarga natija yuborish
      const adminIds = process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(",")
        : [];
      if (adminIds.length > 0) {
        for (const adminId of adminIds) {
          try {
            await bot.telegram.sendMessage(
              parseInt(adminId.trim()),
              adminMessage,
              { parse_mode: "Markdown" }
            );
          } catch (err) {
            console.error("Admin notification error:", err.message);
          }
        }
      }

      console.log("✅ Broadcast completed successfully");
    } catch (broadcastError) {
      console.error("❌ Broadcast error:", broadcastError);
    }
  } catch (error) {
    console.error("Broadcast endpoint error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server xatosi" });
    }
  }
});

module.exports = router;
