const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Atlas ulanish muvaffaqiyatli");
  } catch (error) {
    console.error("❌ MongoDB ulanishda xatolik:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
