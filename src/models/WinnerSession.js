const mongoose = require("mongoose");

const winnerSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    selectionType: {
      type: String,
      enum: ["position", "count"],
      required: true,
    },
    position: {
      type: Number,
      default: null,
    },
    count: {
      type: Number,
      default: null,
    },
    winners: [
      {
        telegramId: Number,
        name: String,
        phone: String,
        region: String,
        promoCode: String,
        points: Number,
        prize: String,
      },
    ],
    createdBy: {
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

module.exports = mongoose.model("WinnerSession", winnerSessionSchema);
