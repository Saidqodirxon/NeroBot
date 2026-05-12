const mongoose = require("mongoose");

const masterPrizeClaimSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    prizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prize",
      required: true,
    },
    prizeName: {
      type: String,
      required: true,
    },
    requiredPoints: {
      type: Number,
      required: true,
    },
    userName: {
      type: String,
      default: null,
    },
    userPhone: {
      type: String,
      default: null,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "given"],
      default: "pending",
      index: true,
    },
    givenAt: {
      type: Date,
      default: null,
    },
    givenBy: {
      type: String,
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

module.exports = mongoose.model("MasterPrizeClaim", masterPrizeClaimSchema);
