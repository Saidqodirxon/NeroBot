const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PromoCode = require("../models/PromoCode");
const User = require("../models/User");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const Season = require("../models/Season");
const Prize = require("../models/Prize");
const { authMiddleware: jwtAuth } = require("../middleware/auth");
const { sendBroadcast } = require("../utils/broadcastNew");
const XLSX = require("xlsx");

// Multer storage configuration for prize images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads/prizes");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "prize-" + uniqueSuffix + path.extname(file.originalname).toLowerCase()
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error("Faqat rasm fayllari (JPEG, PNG, GIF, WEBP) qabul qilinadi")
      );
    }
  },
});

// Telegram bot instance (for sending notifications)
let botInstance = null;
const setBotInstance = (bot) => {
  botInstance = bot;
};

// Helper function to escape MarkdownV2
const escapeMarkdown = (text) => {
  if (!text) return "";
  return text.toString().replace(/[_*\[\]()~>#+\-=|{}.!']/g, "\\$&");
};

// ==================== SEASON MANAGEMENT ====================

// GET: Get all seasons
router.get("/seasons", jwtAuth, async (req, res) => {
  try {
    const seasons = await Season.find().sort({ createdAt: -1 });
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

    // name and startDate are optional now
    const seasonData = {
      name: name || "",
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    };

    if (startDate) seasonData.startDate = startDate;
    if (endDate) seasonData.endDate = endDate;

    const season = await Season.create(seasonData);

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

// ==================== PRIZE MANAGEMENT ====================

// POST: Upload prize image
router.post(
  "/prizes/upload",
  jwtAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Rasm yuklanmadi",
        });
      }

      // Return the file URL
      const imageUrl = `/uploads/prizes/${req.file.filename}`;

      res.json({
        success: true,
        message: "Rasm muvaffaqiyatli yuklandi",
        data: {
          filename: req.file.filename,
          imageUrl: imageUrl,
          fullUrl: `${req.protocol}://${req.get("host")}${imageUrl}`,
        },
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Rasm yuklashda xatolik",
      });
    }
  }
);

// GET: Get all prizes
router.get("/prizes", jwtAuth, async (req, res) => {
  try {
    const { seasonId } = req.query;
    const filter = {};
    if (seasonId && seasonId !== "all") {
      filter.seasonId = seasonId;
    }

    const prizes = await Prize.find(filter)
      .populate("seasonId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prizes,
    });
  } catch (error) {
    console.error("Get prizes error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Create new prize
router.post("/prizes", jwtAuth, async (req, res) => {
  try {
    const { name, description, imageUrl, seasonId, isActive } = req.body;

    if (!name || !imageUrl || !seasonId) {
      return res.status(400).json({
        success: false,
        message: "Nomi, rasm va mavsum talab qilinadi",
      });
    }

    const prize = await Prize.create({
      name,
      description: description || "",
      imageUrl,
      seasonId,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.json({
      success: true,
      message: "Sovg'a yaratildi",
      data: prize,
    });
  } catch (error) {
    console.error("Create prize error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// PUT: Update prize
router.put("/prizes/:id", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, seasonId, isActive } = req.body;

    const prize = await Prize.findByIdAndUpdate(
      id,
      { name, description, imageUrl, seasonId, isActive },
      { new: true }
    );

    if (!prize) {
      return res
        .status(404)
        .json({ success: false, message: "Sovg'a topilmadi" });
    }

    res.json({
      success: true,
      message: "Sovg'a yangilandi",
      data: prize,
    });
  } catch (error) {
    console.error("Update prize error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// DELETE: Delete prize
router.delete("/prizes/:id", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const prize = await Prize.findByIdAndDelete(id);

    if (!prize) {
      return res
        .status(404)
        .json({ success: false, message: "Sovg'a topilmadi" });
    }

    res.json({
      success: true,
      message: "Sovg'a o'chirildi",
    });
  } catch (error) {
    console.error("Delete prize error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET: Get active prizes for bot (public endpoint, no auth)
router.get("/public/prizes", async (req, res) => {
  try {
    const prizes = await Prize.find({ isActive: true })
      .populate("seasonId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: prizes,
    });
  } catch (error) {
    console.error("Get public prizes error:", error);
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

    // Normalize and dedupe incoming codes
    const upperCodes = codes
      .map((c) => (typeof c === "string" ? c.trim().toUpperCase() : ""))
      .filter(Boolean);

    const uniqueCodes = [...new Set(upperCodes)];

    // Fetch existing codes in a single query to avoid N queries
    const existing = await PromoCode.find({
      code: { $in: uniqueCodes },
    }).select("code");
    const existingSet = new Set(existing.map((e) => e.code));

    const validCodes = [];
    const errors = [];

    for (const upperCode of uniqueCodes) {
      if (existingSet.has(upperCode)) {
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
      await PromoCode.insertMany(validCodes, { ordered: false });
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
    const upperCode = code.toUpperCase();

    // Find the code first
    const promoCode = await PromoCode.findOne({ code: upperCode });

    if (!promoCode) {
      return res.status(404).json({ success: false, message: "Kod topilmadi" });
    }

    // If it was used, clean up User reference
    if (promoCode.isUsed && promoCode.usedBy) {
      await User.updateOne(
        { telegramId: promoCode.usedBy, usedPromoCode: upperCode },
        { $set: { usedPromoCode: null } }
      );
    }

    // Clean up usage history
    await PromoCodeUsage.deleteOne({ promoCode: upperCode });

    // Delete the code itself
    await PromoCode.deleteOne({ _id: promoCode._id });

    res.json({
      success: true,
      message: "Kod o'chirildi va user ma'lumotlari tozalandi",
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
    const { region, count = 10, seasonId } = req.body;

    // Filter for promo code usage records
    const usageFilter = {};
    if (region && region !== "all") {
      usageFilter.userRegion = region;
    }
    if (seasonId && seasonId !== "all") {
      usageFilter.seasonId = seasonId;
    }

    // Get all promo code usage records matching filters
    const usageRecords = await PromoCodeUsage.find(usageFilter)
      .populate("seasonId")
      .sort({ usedAt: -1 });

    if (usageRecords.length === 0) {
      return res.json({
        success: false,
        message: "Promo kod yozuvlari topilmadi",
      });
    }

    // Unique users based on telegramId to prevent duplicates
    const uniqueUsersMap = new Map();
    for (const record of usageRecords) {
      if (!uniqueUsersMap.has(record.telegramId)) {
        uniqueUsersMap.set(record.telegramId, record);
      }
    }

    const uniqueUsersArray = Array.from(uniqueUsersMap.values());

    if (uniqueUsersArray.length === 0) {
      return res.json({
        success: false,
        message: "Noyob foydalanuvchilar topilmadi",
      });
    }

    // Randomly select unique users (max 10, no duplicates)
    const winners = [];
    const usageCopy = [...uniqueUsersArray];
    const selectCount = Math.min(count, usageCopy.length);

    for (let i = 0; i < selectCount; i++) {
      const randomIndex = Math.floor(Math.random() * usageCopy.length);
      const selectedUsage = usageCopy[randomIndex];

      // Format winner data
      winners.push({
        _id: selectedUsage._id,
        name: selectedUsage.userName,
        phone: selectedUsage.userPhone,
        region: selectedUsage.userRegion,
        username: selectedUsage.username,
        telegramId: selectedUsage.telegramId,
        promoCode: selectedUsage.promoCode,
        usedAt: selectedUsage.usedAt,
        seasonName: selectedUsage.seasonId?.name || "-",
      });

      // Remove selected user to prevent duplicates
      usageCopy.splice(randomIndex, 1);
    }

    // Send notification to admin group about winners
    if (botInstance && process.env.ADMIN_GROUP_ID) {
      try {
        for (let i = 0; i < winners.length; i++) {
          const winner = winners[i];
          const message =
            `🎉 *G'olib \\#${i + 1} tanlandi\\!*\n\n` +
            `👤 *Ism:* ${escapeMarkdown(winner.name)}\n` +
            `📱 *Telefon:* ${escapeMarkdown(winner.phone)}\n` +
            `🗺 *Viloyat:* ${escapeMarkdown(winner.region)}\n` +
            `✈️ *Username:* ${
              winner.username ? "@" + escapeMarkdown(winner.username) : "Yo'q"
            }\n` +
            `🆔 *Telegram ID:* \`${winner.telegramId}\`\n\n` +
            `🎟 *Tanlangan Kod:* \`${escapeMarkdown(winner.promoCode)}\`\n` +
            `🎭 *Mavsum:* ${escapeMarkdown(winner.seasonName)}\n` +
            `📅 *Kod kiritilgan:* ${escapeMarkdown(
              new Date(winner.usedAt).toLocaleString("uz-UZ")
            )}\n\n` +
            `⏰ *Tanlangan vaqt:* ${escapeMarkdown(
              new Date().toLocaleString("uz-UZ")
            )}`;

          await botInstance.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
            message,
            { parse_mode: "MarkdownV2" }
          );
        }
      } catch (error) {
        console.error("Admin notification error:", error);
      }
    }

    res.json({
      success: true,
      data: winners,
      total: uniqueUsersArray.length,
    });
  } catch (error) {
    console.error("Random winner error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== USER BLOCK/UNBLOCK ====================

// POST: Block user
router.post("/users/:id/block", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    if (user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Foydalanuvchi allaqachon bloklangan",
      });
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = reason || "Adminlar tomonidan bloklangan";
    await user.save();

    res.json({
      success: true,
      message: "Foydalanuvchi bloklandi",
      data: user,
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST: Unblock user
router.post("/users/:id/unblock", jwtAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    if (!user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Foydalanuvchi bloklanmagan",
      });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedReason = null;
    await user.save();

    res.json({
      success: true,
      message: "Foydalanuvchi blokdan chiqarildi",
      data: user,
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ==================== BROADCAST ====================

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
module.exports.setBotInstance = setBotInstance;
