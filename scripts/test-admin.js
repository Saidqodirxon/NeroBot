require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function testAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB ulanish muvaffaqiyatli\n");

    // MongoDB'dagi adminni tekshirish
    const Admin = require("../src/models/Admin");
    const admin = await Admin.findOne({ username: "admin" });

    if (!admin) {
      console.log("❌ Admin topilmadi!");
      console.log("\nYangi admin yaratilmoqda...\n");

      const newAdmin = new Admin({
        username: "admin",
        password: "admin123",
        telegramId: 1551855614,
        role: "admin",
      });

      await newAdmin.save();
      console.log("✅ Admin yaratildi!");
      console.log("   Username: admin");
      console.log("   Password: admin123");
      console.log("   Telegram ID:", 1551855614);
    } else {
      console.log("✅ Admin topildi:");
      console.log("   ID:", admin._id);
      console.log("   Username:", admin.username);
      console.log("   Role:", admin.role);
      console.log("   Telegram ID:", admin.telegramId);
      console.log("   Password hash:", admin.password.substring(0, 20) + "...");

      // Test password
      console.log("\n🔐 Password test:");
      const testPassword = "admin123";
      const isMatch = await admin.comparePassword(testPassword);
      console.log(
        `   Password "${testPassword}":`,
        isMatch ? "✅ To'g'ri" : "❌ Noto'g'ri"
      );

      if (!isMatch) {
        console.log("\n🔄 Password yangilanmoqda...");
        admin.password = "admin123";
        await admin.save();
        console.log("✅ Password yangilandi: admin123");
      }
    }

    console.log("\n📝 Login ma'lumotlar:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   URL: http://localhost:3000/api/v1/auth/login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error.message);
    process.exit(1);
  }
}

testAdmin();
