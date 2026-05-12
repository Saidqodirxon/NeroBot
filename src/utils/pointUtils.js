const mongoose = require("mongoose");
const PromoCodeUsage = require("../models/PromoCodeUsage");
const MasterPrizeClaim = require("../models/MasterPrizeClaim");

async function getSeasonPoints(telegramId, seasonId) {
  const sid = new mongoose.Types.ObjectId(seasonId);
  const [earned, spent] = await Promise.all([
    PromoCodeUsage.aggregate([
      { $match: { telegramId, seasonId: sid } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]),
    MasterPrizeClaim.aggregate([
      { $match: { telegramId, seasonId: sid, status: "given" } },
      { $group: { _id: null, total: { $sum: "$requiredPoints" } } },
    ]),
  ]);
  return (earned[0]?.total || 0) - (spent[0]?.total || 0);
}

module.exports = { getSeasonPoints };
