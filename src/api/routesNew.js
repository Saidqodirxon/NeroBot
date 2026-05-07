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
const MasterApplication = require("../models/MasterApplication");
const MasterPrizeClaim = require("../models/MasterPrizeClaim");
const WinnerSession = require("../models/WinnerSession");
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

const buildDrawingFilter = async ({ region, seasonId, excludeIds = [], excludePromoCodes = [] }) => {
  const filter = {};

  if (region && region !== "all") {
    filter.userRegion = region === "Toshkent"
      ? { $in: ["Toshkent shahri", "Toshkent viloyati"] }
      : region;
  }
  if (seasonId && seasonId !== "all") {
    filter.seasonId = seasonId;
  }

  let allowedIds = await User.find({ userType: "user" }).distinct("telegramId");
  if (excludeIds.length > 0) {
    allowedIds = allowedIds.filter((id) => !excludeIds.includes(id));
  }

  if (allowedIds.length > 0) {
    filter.telegramId = { $in: allowedIds };
  } else if (excludeIds.length > 0) {
    return { filter: null, exhausted: true };
  }

  if (excludePromoCodes.length > 0) {
    filter.promoCode = { $nin: excludePromoCodes.map((code) => String(code || "").toUpperCase()) };
  }

  return { filter, exhausted: false };
};

const loadDrawingPool = async ({ region, seasonId, excludeIds = [], excludePromoCodes = [] }) => {
  const { filter, exhausted } = await buildDrawingFilter({ region, seasonId, excludeIds, excludePromoCodes });
  if (exhausted) return { exhausted: true, records: [], pool: [] };

  const records = await PromoCodeUsage.find(filter)
    .populate("seasonId", "name")
    .sort({ usedAt: -1 });

  if (!records.length) {
    return { exhausted: false, records: [], pool: [] };
  }

  const seenTelegram = new Set();
  const seenPromo = new Set();
  const uniqueMap = new Map();
  for (const r of records) {
    const promo = String(r.promoCode || "").toUpperCase();
    if (!r.telegramId || !promo) continue;
    if (seenTelegram.has(r.telegramId) || seenPromo.has(promo)) continue;
    seenTelegram.add(r.telegramId);
    seenPromo.add(promo);
    uniqueMap.set(`${r.telegramId}:${promo}`, r);
  }

  const pool = Array.from(uniqueMap.values());

  return { exhausted: false, records, pool };
};

const formatDrawingParticipant = (r) => ({
  telegramId: r.telegramId,
  name: r.userName,
  phone: r.userPhone,
  region: r.userRegion,
  username: r.username,
  promoCode: String(r.promoCode || "").toUpperCase(),
  usedAt: r.usedAt,
  seasonName: r.seasonId?.name || "—",
});

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
    const { name, description, imageUrl, seasonId, isActive, prizeType, position, requiredPoints } = req.body;

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
      prizeType: prizeType || "random",
      position: position !== undefined ? position : null,
      requiredPoints: requiredPoints !== undefined ? requiredPoints : null,
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
    const { name, description, imageUrl, seasonId, isActive, prizeType, position, requiredPoints } = req.body;

    const updateData = { name, description, imageUrl, seasonId, isActive };
    if (prizeType !== undefined) updateData.prizeType = prizeType;
    if (position !== undefined) updateData.position = position;
    if (requiredPoints !== undefined) updateData.requiredPoints = requiredPoints;

    const prize = await Prize.findByIdAndUpdate(id, updateData, { new: true });

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
    const { codes, description, seasonId, points } = req.body;

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
    const pointsValue = parseInt(points) || 0;

    for (const upperCode of uniqueCodes) {
      if (existingSet.has(upperCode)) {
        errors.push({ code: upperCode, error: "Allaqachon mavjud" });
        continue;
      }

      validCodes.push({
        code: upperCode,
        seasonId: seasonId,
        description: description || "",
        points: pointsValue,
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
// GET: Get promo codes with filters
router.get("/promo-codes", jwtAuth, async (req, res) => {
  try {
    const { used, seasonId, limit = 100, skip = 0, search } = req.query;

    const filter = {};
    if (used !== undefined) {
      filter.isUsed = used === "true";
    }
    if (seasonId && seasonId !== "all") {
      filter.seasonId = seasonId;
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

// PUT: Bulk update promo codes
router.put("/promo-codes/bulk", jwtAuth, async (req, res) => {
  try {
    // Increase timeout for this specific request if possible (Node.js default is usually fine, but server config matters)
    req.setTimeout(300000); // 5 minutes

    const { filter: clientFilter, points } = req.body;

    // Reconstruct filter from client params
    const baseFilter = {};
    if (clientFilter.seasonId && clientFilter.seasonId !== "all") {
      baseFilter.seasonId = clientFilter.seasonId;
    }
    if (clientFilter.search) {
      const searchRegex = new RegExp(clientFilter.search.trim(), "i");
      baseFilter.$or = [
        { code: searchRegex },
        { description: searchRegex },
        { usedByName: searchRegex },
        { usedByPhone: searchRegex },
      ];
    }
    // "used" filter is handled below specifically

    const newPoints = parseInt(points);
    if (isNaN(newPoints)) {
      return res
        .status(400)
        .json({ success: false, message: "Ball noto'g'ri kiritildi" });
    }

    let totalUpdated = 0;

    // STRATEGY:
    // 1. Update UNUSED codes directly in DB (Fastest)
    // 2. Update USED codes via iteration to handle User point adjustments (Slower but necessary)

    // --- Part 1: Unused Codes ---
    // If client requested "all" or "unused"
    if (
      clientFilter.used === undefined ||
      clientFilter.used === "all" ||
      clientFilter.used === "unused"
    ) {
      const unusedFilter = { ...baseFilter, isUsed: false };
      // Ensure we don't update if points are same (optional optimization check, but updateMany is fast enough)
      // We'll just update all matching unused.
      const unusedResult = await PromoCode.updateMany(unusedFilter, {
        $set: { points: newPoints },
      });
      totalUpdated += unusedResult.modifiedCount;
    }

    // --- Part 2: Used Codes ---
    // If client requested "all" or "used"
    if (
      clientFilter.used === undefined ||
      clientFilter.used === "all" ||
      clientFilter.used === "used"
    ) {
      const usedFilter = { ...baseFilter, isUsed: true };

      // We only need to process if points are DIFFERENT.
      // So we find used codes where points != newPoints
      const usedCodes = await PromoCode.find({
        ...usedFilter,
        points: { $ne: newPoints },
      })
        .select("code points usedBy isUsed")
        .lean(); // lean for performance

      if (usedCodes.length > 0) {
        const User = require("../models/User");
        const PromoCodeUsage = require("../models/PromoCodeUsage");

        const promoOps = [];
        const userOps = [];
        const usageOps = [];
        const userMap = new Map(); // telegramId -> diff

        for (const code of usedCodes) {
          const oldPoints = code.points || 0;
          const diff = newPoints - oldPoints;

          // 1. PromoCode update op
          promoOps.push({
            updateOne: {
              filter: { _id: code._id },
              update: { $set: { points: newPoints } },
            },
          });

          // 2. Accumulate User diff
          if (code.usedBy) {
            userMap.set(code.usedBy, (userMap.get(code.usedBy) || 0) + diff);
          }

          // 3. Usage update op
          usageOps.push({
            updateMany: {
              filter: { promoCode: code.code },
              update: { $set: { points: newPoints } },
            },
          });
        }

        // Convert userMap to bulk ops
        for (const [telegramId, diff] of userMap.entries()) {
          userOps.push({
            updateOne: {
              filter: { telegramId: telegramId },
              update: { $inc: { totalPoints: diff } },
            },
          });
        }

        // EXECUTE BATCHES
        const BATCH_SIZE = 1000;

        // Helper to execute in batches
        const runBatches = async (model, ops) => {
          for (let i = 0; i < ops.length; i += BATCH_SIZE) {
            await model.bulkWrite(ops.slice(i, i + BATCH_SIZE));
          }
        };

        await Promise.all([
          runBatches(PromoCode, promoOps),
          runBatches(User, userOps),
          runBatches(PromoCodeUsage, usageOps),
        ]);

        totalUpdated += usedCodes.length;
      }
    }

    res.json({
      success: true,
      message: `${totalUpdated} ta kod muvaffaqiyatli yangilandi`,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// PUT: Single update promo code
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
    console.error("Update promo code error:", error);
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

    // If it was used, deduct points and clean up User reference
    if (promoCode.isUsed && promoCode.usedBy) {
      const user = await User.findOne({ telegramId: promoCode.usedBy });
      if (user) {
        const points = promoCode.points || 0;
        user.totalPoints = Math.max(0, (user.totalPoints || 0) - points);
        if (user.usedPromoCode === upperCode) {
          user.usedPromoCode = null;
        }
        await user.save();
      }

      // Cleanup usage history
      await PromoCodeUsage.deleteOne({
        promoCode: upperCode,
        telegramId: promoCode.usedBy, // Ensure matching user
      });
    }

    // Delete the code itself
    await PromoCode.deleteOne({ _id: promoCode._id });

    res.json({
      success: true,
      message: "Kod o'chirildi va ballar qaytarildi",
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
    const { region, limit = 100, skip = 0, userType } = req.query;

    const filter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        filter.region = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        filter.region = region;
      }
    }
    if (userType && userType !== "all") {
      filter.userType = userType;
    }

    const users = await User.find(filter)
      .sort({ totalPoints: -1, registeredAt: -1 }) // Sort by points first
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
    const regionGroupFilter = {};
    if (seasonId && seasonId !== "all") {
      // If we had season specific user filtering by region, we would add it here
      // But currently User model doesn't have seasonId
    }

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

    // Top users by POINTS (season filtered)
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
          _id: "$telegramId", // Group by user
          totalPoints: { $sum: "$points" }, // Sum points instead of counting codes
          codeCount: { $sum: 1 }, // Keep count info too
          userName: { $first: "$userName" },
          userPhone: { $first: "$userPhone" },
          userRegion: { $first: "$userRegion" },
        },
      },
      { $sort: { totalPoints: -1 } }, // Sort by points
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
    let filter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        filter.region = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        filter.region = region;
      }
    }
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
      if (region === "Toshkent") {
        usageFilter.userRegion = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        usageFilter.userRegion = region;
      }
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

// ===== USTALAR =====

// GET /masters - ustalar ro'yxati
router.get("/masters", jwtAuth, async (req, res) => {
  try {
    const { search, region, page = 1, limit = 50 } = req.query;
    const filter = { userType: "master" };
    if (region) filter.region = region;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { profession: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ masterApprovedAt: -1, registeredAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("telegramId name phone region profession totalPoints masterApprovedAt registeredAt username"),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, total, data });
  } catch (err) {
    console.error("GET /masters error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET /masters/:telegramId/history - usta kodlar tarixi
router.get("/masters/:telegramId/history", jwtAuth, async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    const [user, usages] = await Promise.all([
      User.findOne({ telegramId, userType: "master" }).select("name phone profession totalPoints"),
      PromoCodeUsage.find({ telegramId }).sort({ usedAt: -1 }),
    ]);
    if (!user) return res.status(404).json({ success: false, message: "Usta topilmadi" });
    res.json({ success: true, user, data: usages });
  } catch (err) {
    console.error("GET /masters/:id/history error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ===== USTA ARIZALARI =====

// GET /master-applications - arizalar ro'yxati
router.get("/master-applications", jwtAuth, async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      MasterApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      MasterApplication.countDocuments(filter),
    ]);
    res.json({ success: true, total, data });
  } catch (err) {
    console.error("GET /master-applications error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST /master-applications/:id/approve - tasdiqlash
router.post("/master-applications/:id/approve", jwtAuth, async (req, res) => {
  try {
    const app = await MasterApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: "Ariza topilmadi" });
    if (app.status !== "pending") return res.status(400).json({ success: false, message: "Ariza allaqachon ko'rib chiqilgan" });

    await Promise.all([
      MasterApplication.updateOne({ _id: app._id }, {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: req.admin?.username || "admin",
      }),
      User.updateOne({ telegramId: app.telegramId }, {
        userType: "master",
        profession: app.profession,
        masterApprovedAt: new Date(),
      }),
    ]);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(
          app.telegramId,
          "✅ <b>Tabriklaymiz!</b>\n\n" +
            "Siz <b>Usta</b> maqomini oldingiz!\n\n" +
            "«👨‍🔧 Mening kabinetim» tugmasini bosib kabinetingizga kiring.",
          { parse_mode: "HTML" }
        );
      } catch (notifyErr) {
        console.error("Master approve bot notify error:", notifyErr.message);
      }
    }

    res.json({ success: true, message: "Ariza tasdiqlandi" });
  } catch (err) {
    console.error("POST /master-applications/:id/approve error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST /master-applications/:id/reject - rad etish
router.post("/master-applications/:id/reject", jwtAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const app = await MasterApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: "Ariza topilmadi" });
    if (app.status !== "pending") return res.status(400).json({ success: false, message: "Ariza allaqachon ko'rib chiqilgan" });

    await MasterApplication.updateOne({ _id: app._id }, {
      status: "rejected",
      rejectionReason: reason || null,
      reviewedAt: new Date(),
      reviewedBy: req.admin?.username || "admin",
    });

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(
          app.telegramId,
          "❌ <b>Arizangiz rad etildi</b>\n\n" +
            `Sabab: ${reason || "Ko'rsatilmagan"}\n\n` +
            "Savollar bo'lsa qo'llab-quvvatlashga murojaat qiling.",
          { parse_mode: "HTML" }
        );
      } catch (notifyErr) {
        console.error("Master reject bot notify error:", notifyErr.message);
      }
    }

    res.json({ success: true, message: "Ariza rad etildi" });
  } catch (err) {
    console.error("POST /master-applications/:id/reject error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ===== USTA SOVGA TALABLARI =====

// GET /master-prize-claims - talablar ro'yxati
router.get("/master-prize-claims", jwtAuth, async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      MasterPrizeClaim.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      MasterPrizeClaim.countDocuments(filter),
    ]);
    res.json({ success: true, total, data });
  } catch (err) {
    console.error("GET /master-prize-claims error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST /master-prize-claims/:id/give - ball ayirish va topshirish
router.post("/master-prize-claims/:id/give", jwtAuth, async (req, res) => {
  try {
    const claim = await MasterPrizeClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: "Talab topilmadi" });
    if (claim.status !== "pending") return res.status(400).json({ success: false, message: "Talab allaqachon ko'rib chiqilgan" });

    const user = await User.findOne({ telegramId: claim.telegramId });
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (user.totalPoints < claim.requiredPoints) {
      return res.status(400).json({ success: false, message: `Yetarli ball yo'q. Kerakli: ${claim.requiredPoints}, Mavjud: ${user.totalPoints}` });
    }

    await Promise.all([
      User.updateOne({ telegramId: claim.telegramId }, { $inc: { totalPoints: -claim.requiredPoints } }),
      MasterPrizeClaim.updateOne({ _id: claim._id }, {
        status: "given",
        givenAt: new Date(),
        givenBy: req.admin?.username || "admin",
      }),
    ]);

    if (botInstance) {
      try {
        await botInstance.telegram.sendMessage(
          claim.telegramId,
          `🎁 <b>Tabriklaymiz!</b>\n\n` +
            `"${claim.prizeName}" sovg'asi tayyor!\n` +
            `${claim.requiredPoints} ball hisobingizdan ayirildi.\n\n` +
            "Admin bilan bog'laning yoki bizga keling.",
          { parse_mode: "HTML" }
        );
      } catch (notifyErr) {
        console.error("Prize claim give bot notify error:", notifyErr.message);
      }
    }

    res.json({ success: true, message: "Sovg'a topshirildi va ball ayirildi" });
  } catch (err) {
    console.error("POST /master-prize-claims/:id/give error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ===== G'OLIB SESSIYALARI =====

// POST /winner-sessions - sessiya saqlash
router.post("/winner-sessions", jwtAuth, async (req, res) => {
  try {
    const { title, seasonId, region, selectionType, position, count, winners } = req.body;
    const session = await WinnerSession.create({
      title,
      seasonId: seasonId || null,
      region: region || null,
      selectionType,
      position: position || null,
      count: count || null,
      winners: winners || [],
      createdBy: req.admin?.username || "admin",
    });
    res.json({ success: true, data: session });
  } catch (err) {
    console.error("POST /winner-sessions error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET /winner-sessions - sessiyalar ro'yxati
router.get("/winner-sessions", jwtAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      WinnerSession.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate("seasonId", "name"),
      WinnerSession.countDocuments(),
    ]);
    res.json({ success: true, total, data });
  } catch (err) {
    console.error("GET /winner-sessions error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// GET /winner-sessions/:id - bitta sessiya
router.get("/winner-sessions/:id", jwtAuth, async (req, res) => {
  try {
    const session = await WinnerSession.findById(req.params.id).populate("seasonId", "name");
    if (!session) return res.status(404).json({ success: false, message: "Sessiya topilmadi" });
    res.json({ success: true, data: session });
  } catch (err) {
    console.error("GET /winner-sessions/:id error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ===== DRAWING SYSTEM (new slot-machine style) =====

router.get("/drawing/preview", jwtAuth, async (req, res) => {
  try {
    const { region = "all", seasonId = "all" } = req.query;
    const { pool } = await loadDrawingPool({ region, seasonId, excludeIds: [] });
    res.json({ success: true, totalParticipants: pool.length });
  } catch (err) {
    console.error("drawing/preview error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

router.post("/drawing/start", jwtAuth, async (req, res) => {
  try {
    const { region, seasonId, excludeIds = [], excludePromoCodes = [] } = req.body;

    const filter = {};
    if (region && region !== "all") {
      filter.userRegion = region === "Toshkent"
        ? { $in: ["Toshkent shahri", "Toshkent viloyati"] }
        : region;
    }
    if (seasonId && seasonId !== "all") filter.seasonId = seasonId;

    let allowedIds = await User.find({ userType: "user" }).distinct("telegramId");
    if (excludeIds.length > 0) {
      allowedIds = allowedIds.filter((id) => !excludeIds.includes(id));
    }
    if (allowedIds.length > 0) {
      filter.telegramId = { $in: allowedIds };
    } else if (excludeIds.length > 0) {
      return res.json({ success: false, message: "Qo'shimcha ishtirokchilar qolmadi" });
    }

    const records = await PromoCodeUsage.find(filter)
      .populate("seasonId", "name")
      .sort({ usedAt: -1 });

    if (!records.length) {
      return res.json({ success: false, message: "Ishtirokchilar topilmadi" });
    }

    // Unique users and promo codes
    const seenTelegram = new Set();
    const seenPromo = new Set();
    const pool = [];
    for (const r of records) {
      const promo = String(r.promoCode || "").toUpperCase();
      if (!r.telegramId || !promo) continue;
      if (seenTelegram.has(r.telegramId) || seenPromo.has(promo)) continue;
      if (excludePromoCodes.map((code) => String(code || "").toUpperCase()).includes(promo)) continue;
      seenTelegram.add(r.telegramId);
      seenPromo.add(promo);
      pool.push(r);
    }

    if (!pool.length) {
      return res.json({ success: false, message: "Ishtirokchilar topilmadi" });
    }

    const winnerRecord = pool[Math.floor(Math.random() * pool.length)];
    const winner = {
      telegramId: winnerRecord.telegramId,
      name: winnerRecord.userName,
      phone: winnerRecord.userPhone,
      region: winnerRecord.userRegion,
      username: winnerRecord.username,
      promoCode: winnerRecord.promoCode,
      usedAt: winnerRecord.usedAt,
      seasonName: winnerRecord.seasonId?.name || "—",
    };

    const participants = pool.map((r) => ({
      telegramId: r.telegramId,
      name: r.userName,
      phone: r.userPhone,
      region: r.userRegion,
      username: r.username,
      promoCode: String(r.promoCode || "").toUpperCase(),
      usedAt: r.usedAt,
      seasonName: r.seasonId?.name || "—",
    }));

    res.json({
      success: true,
      totalParticipants: pool.length,
      winner,
      participants,
      allCodes: participants.map((p) => p.promoCode),
    });
  } catch (err) {
    console.error("drawing/start error:", err);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

router.post("/drawing/export-xlsx", jwtAuth, async (req, res) => {
  try {
    const { winners = [], sessionTitle = "goliblar" } = req.body;
    const rows = winners.map((w, index) => ({
      "#": index + 1,
      Ism: w.name || "-",
      Telefon: w.phone || "-",
      Viloyat: w.region || "-",
      Kod: w.promoCode || "-",
      Username: w.username ? `@${w.username}` : "-",
      Mavsum: w.seasonName || "-",
      "Telegram ID": w.telegramId || "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "G'oliblar");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeName = String(sessionTitle || "goliblar")
      .replace(/[^\w\-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "goliblar";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${safeName}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("Drawing export xlsx error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ===== DRAWING SYSTEM =====

// POST /drawing/start — G'olib tanlash tizimi
router.post("/drawing/start", jwtAuth, async (req, res) => {
  try {
    const { region, seasonId, excludeIds = [], excludePromoCodes = [] } = req.body;

    const usageFilter = {};
    if (region && region !== "all") {
      if (region === "Toshkent") {
        usageFilter.userRegion = { $in: ["Toshkent shahri", "Toshkent viloyati"] };
      } else {
        usageFilter.userRegion = region;
      }
    }
    if (seasonId && seasonId !== "all") {
      usageFilter.seasonId = seasonId;
    }

    // Faqat user rollar
    let allowedIds = await User.find({ userType: "user" }).distinct("telegramId");
    // Oldingi g'oliblarni chiqarib tashlash
    if (excludeIds.length > 0) {
      allowedIds = allowedIds.filter((id) => !excludeIds.includes(id));
    }
    if (allowedIds.length > 0) {
      usageFilter.telegramId = { $in: allowedIds };
    } else if (excludeIds.length > 0) {
      return res.json({ success: false, message: "Qo'shimcha ishtirokchilar qolmadi" });
    }

    const usageRecords = await PromoCodeUsage.find(usageFilter)
      .populate("seasonId")
      .sort({ usedAt: -1 });

    if (usageRecords.length === 0) {
      return res.json({ success: false, message: "Ishtirokchilar topilmadi" });
    }

    const seenTelegram = new Set();
    const seenPromo = new Set();
    const pool = [];
    const excludedPromos = excludePromoCodes.map((code) => String(code || "").toUpperCase());
    for (const r of usageRecords) {
      const promo = String(r.promoCode || "").toUpperCase();
      if (!r.telegramId || !promo) continue;
      if (seenTelegram.has(r.telegramId) || seenPromo.has(promo)) continue;
      if (excludedPromos.includes(promo)) continue;
      seenTelegram.add(r.telegramId);
      seenPromo.add(promo);
      pool.push(r);
    }

    if (pool.length === 0) {
      return res.json({ success: false, message: "Noyob ishtirokchilar topilmadi" });
    }

    const winnerRecord = pool[Math.floor(Math.random() * pool.length)];

    const winner = {
      telegramId: winnerRecord.telegramId,
      name:       winnerRecord.userName,
      phone:      winnerRecord.userPhone,
      region:     winnerRecord.userRegion,
      username:   winnerRecord.username,
      promoCode:  winnerRecord.promoCode,
      usedAt:     winnerRecord.usedAt,
      seasonName: winnerRecord.seasonId?.name || "—",
    };

    const allCodes = pool.map((r) => r.promoCode.toUpperCase());

    res.json({
      success:           true,
      winner,
      allCodes,
      totalParticipants: pool.length,
    });
  } catch (error) {
    console.error("Drawing start error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// POST /drawing/notify — G'olib(lar)ni admin guruhga yuborish
router.post("/drawing/notify", jwtAuth, async (req, res) => {
  try {
    const { winners, sessionTitle } = req.body;
    if (!winners || !winners.length) {
      return res.status(400).json({ success: false, message: "G'oliblar ko'rsatilmagan" });
    }

    const titleLine = sessionTitle ? `🎯 *${escapeMarkdown(sessionTitle)}*\n\n` : "🎯 *G'olib\\(lar\\)*\n\n";
    let sent = 0;
    let sentToWinners = 0;
    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      try {
        if (botInstance && process.env.ADMIN_GROUP_ID) {
          await botInstance.telegram.sendMessage(
            process.env.ADMIN_GROUP_ID,
            titleLine +
              `🏆 *${i + 1}\\-o'rin g'olibi*\n\n` +
              `👤 *Ism:* ${escapeMarkdown(w.name)}\n` +
              `📱 *Telefon:* ${escapeMarkdown(w.phone)}\n` +
              `🗺 *Viloyat:* ${escapeMarkdown(w.region)}\n` +
              (w.username ? `✈️ *Username:* @${escapeMarkdown(w.username)}\n` : "") +
              `🆔 *Telegram ID:* \`${w.telegramId}\`\n` +
              `🎟 *Kod:* \`${escapeMarkdown(w.promoCode)}\`\n` +
              (w.seasonName ? `🎭 *Mavsum:* ${escapeMarkdown(w.seasonName)}\n` : "") +
              `\n⏰ ${escapeMarkdown(new Date().toLocaleString("uz-UZ"))}`,
            { parse_mode: "MarkdownV2" }
          );
          sent++;
        }
        if (botInstance && w.telegramId) {
          await botInstance.telegram.sendMessage(
            w.telegramId,
            `Tabriklaymiz! Siz g'olib bo'ldingiz.\n\n` +
              `O'rin: ${i + 1}\n` +
              `Ism: ${w.name || "-"}\n` +
              `Kod: ${w.promoCode || "-"}\n` +
              `Mavsum: ${w.seasonName || "-"}\n` +
              `Viloyat: ${w.region || "-"}`
          );
          sentToWinners++;
        }
      } catch (err) {
        console.error("Notify send error:", err.message);
      }
    }

    res.json({ success: true, sent, sentToWinners });
  } catch (error) {
    console.error("Drawing notify error:", error);
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

module.exports = router;
module.exports.setBotInstance = setBotInstance;
