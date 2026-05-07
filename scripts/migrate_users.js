require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB ga ulandi");

    const result = await User.updateMany(
      { $or: [{ userType: null }, { userType: { $exists: false } }] },
      { $set: { userType: "user" } }
    );

    console.log(`✅ ${result.modifiedCount} ta foydalanuvchi yangilandi`);

    const total = await User.countDocuments();
    const masters = await User.countDocuments({ userType: "master" });
    const users = await User.countDocuments({ userType: "user" });

    console.log(`\n📈 Natija:`);
    console.log(`   Jami: ${total}`);
    console.log(`   👤 Foydalanuvchilar: ${users}`);
    console.log(`   👨‍🔧 Ustalar: ${masters}`);
  } catch (err) {
    console.error("❌ Xatolik:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
