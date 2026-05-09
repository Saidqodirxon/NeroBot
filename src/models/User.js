const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    firstName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    usedPromoCode: {
      type: String,
      default: null,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      default: null,
    },
    userType: {
      type: String,
      enum: ['user', 'master'],
      default: 'user',
      index: true,
    },
    profession: {
      type: String,
      default: null,
    },
    masterApprovedAt: {
      type: Date,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    phoneUpdateRequestSent: {
      type: Boolean,
      default: false,
    },
    phoneUpdateRequestSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
