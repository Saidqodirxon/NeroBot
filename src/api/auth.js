const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const {
  generateToken,
  authMiddleware,
  checkRole,
} = require("../middleware/auth");

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Noto'g'ri login yoki parol",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Noto'g'ri login yoki parol",
      });
    }

    const token = generateToken(admin);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Login xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatoligi",
    });
  }
});

// Create new admin (only super admin)
router.post(
  "/admin",
  authMiddleware,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { username, password, telegramId, role } = req.body;

      const exists = await Admin.findOne({
        $or: [{ username }, { telegramId }],
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Bu login yoki Telegram ID band",
        });
      }

      const admin = new Admin({
        username,
        password,
        telegramId,
        role: role || "moderator",
      });

      await admin.save();

      res.status(201).json({
        success: true,
        message: "Admin yaratildi",
      });
    } catch (error) {
      console.error("Admin yaratishda xatolik:", error);
      res.status(500).json({
        success: false,
        message: "Server xatoligi",
      });
    }
  }
);

// Get admin profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server xatoligi",
    });
  }
});

// Update admin profile
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("Profile update request:", {
      adminId: req.admin?.id,
      username,
      hasPassword: !!password,
    });

    if (!req.admin || !req.admin.id) {
      return res.status(401).json({
        success: false,
        message: "Autentifikatsiya talab qilinadi",
      });
    }

    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      console.error("Admin not found:", req.admin.id);
      return res.status(404).json({
        success: false,
        message: "Admin topilmadi",
      });
    }

    // Faqat username va password ni yangilash (telegramId o'zgarmas)
    if (username && username !== admin.username) {
      const exists = await Admin.findOne({ username, _id: { $ne: admin._id } });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Bu username band",
        });
      }
      admin.username = username;
    }

    if (password) {
      admin.password = password;
    }

    await admin.save();

    console.log("Profile updated successfully:", admin.username);

    res.json({
      success: true,
      message: "Ma'lumotlar muvaffaqiyatli yangilandi",
      data: {
        username: admin.username,
        role: admin.role,
        telegramId: admin.telegramId,
      },
    });
  } catch (error) {
    console.error("Profile update xatolik:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Server xatoligi: " + error.message,
    });
  }
});

module.exports = router;
