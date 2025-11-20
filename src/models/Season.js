const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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
seasonSchema.index({ isActive: 1, startDate: -1 });

// Mavsum o'chirilganda, tegishli barcha sovg'alarni ham o'chirish
seasonSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      const Prize = require("./Prize");
      await Prize.deleteMany({ seasonId: this._id });
      next();
    } catch (error) {
      next(error);
    }
  }
);

seasonSchema.pre("findOneAndDelete", async function (next) {
  try {
    const Prize = require("./Prize");
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      await Prize.deleteMany({ seasonId: doc._id });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Season", seasonSchema);
