const mongoose = require("mongoose");

const prizeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      required: true, // Rasm URL yoki file path
    },
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    prizeType: {
      type: String,
      enum: ["random", "points"],
      default: "random",
      index: true,
    },
    position: {
      type: Number,
      default: null,
    },
    requiredPoints: {
      type: Number,
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

// Index for faster queries
prizeSchema.index({ seasonId: 1, isActive: 1 });

module.exports = mongoose.model("Prize", prizeSchema);
