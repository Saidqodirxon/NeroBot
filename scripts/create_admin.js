require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../src/models/Admin");

const USERNAME = "admin";
const PASSWORD = "admin123";
const TELEGRAM_ID = 1551855614; // .env dagi ADMIN_IDS

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB ga ulandi");

    const exists = await Admin.findOne({ username: USERNAME });
    if (exists) {
      console.log(`⚠️  Admin allaqachon mavjud: ${USERNAME}`);
      console.log(`🔑 Login: ${USERNAME}`);
      console.log(`🔑 Parol: ${PASSWORD}`);
      process.exit(0);
    }

    const admin = new Admin({
      username: USERNAME,
      password: PASSWORD,
      telegramId: TELEGRAM_ID,
      role: "admin",
    });

    await admin.save();

    console.log("✅ Admin muvaffaqiyatli yaratildi!");
    console.log(`👤 Login:    ${USERNAME}`);
    console.log(`🔑 Parol:    ${PASSWORD}`);
    console.log(`🎭 Rol:      admin`);
    console.log(`\n🌐 Admin panel: http://localhost:3000`);
  } catch (err) {
    console.error("❌ Xatolik:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
