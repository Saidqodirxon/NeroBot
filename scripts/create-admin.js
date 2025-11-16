require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const Admin = require("../src/models/Admin");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log("\n🚀 Admin Yaratish\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB ulanish muvaffaqiyatli\n");

    const username = await question("Username: ");
    const password = await question("Password: ");
    const telegramId = await question("Telegram ID: ");
    const role =
      (await question("Role (admin/moderator) [admin]: ")) || "admin";

    const admin = new Admin({
      username: username.trim(),
      password: password.trim(),
      telegramId: parseInt(telegramId.trim()),
      role: role.trim(),
    });

    await admin.save();

    console.log("\n✅ Admin muvaffaqiyatli yaratildi!");
    console.log("\n📋 Ma'lumotlar:");
    console.log("   Username:", admin.username);
    console.log("   Telegram ID:", admin.telegramId);
    console.log("   Role:", admin.role);
    console.log("\nEndi admin panel'ga kirish mumkin: http://localhost:3000\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Xatolik:", error.message);
    process.exit(1);
  }
}

createAdmin();
