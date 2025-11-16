const mongoose = require("mongoose");

const promoCodeUsageSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userPhone: {
      type: String,
      required: true,
    },
    userRegion: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      default: null,
    },
    promoCode: {
      type: String,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Bir user bir kodni faqat bir marta ishlatishi mumkin
promoCodeUsageSchema.index({ telegramId: 1, promoCode: 1 }, { unique: true });

module.exports = mongoose.model("PromoCodeUsage", promoCodeUsageSchema);
