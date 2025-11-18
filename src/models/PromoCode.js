const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: Number,
      default: null,
    },
    usedByName: {
      type: String,
      default: null,
    },
    usedByPhone: {
      type: String,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PromoCode", promoCodeSchema);
