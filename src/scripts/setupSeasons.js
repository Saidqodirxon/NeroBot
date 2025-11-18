/**
 * Migration and Setup Script
 *
 * This script helps:
 * 1. Create a default season if none exists
 * 2. Migrate existing promo codes to default season
 * 3. Migrate existing usage records to default season
 *
 * Run with: node src/scripts/setupSeasons.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Season = require("../models/Season");
const PromoCode = require("../models/PromoCode");
const PromoCodeUsage = require("../models/PromoCodeUsage");

async function setupSeasons() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if seasons exist
    const existingSeasons = await Season.countDocuments();
    console.log(`📊 Existing seasons: ${existingSeasons}`);

    let defaultSeason;

    if (existingSeasons === 0) {
      // Create default season
      defaultSeason = await Season.create({
        name: "Mavsum 1",
        description: "Default mavsum",
        startDate: new Date("2024-01-01"),
        isActive: true,
      });
      console.log("✅ Default season created:", defaultSeason.name);
    } else {
      // Use first active season
      defaultSeason = await Season.findOne({ isActive: true });
      if (!defaultSeason) {
        defaultSeason = await Season.findOne().sort({ startDate: -1 });
      }
      console.log("✅ Using existing season:", defaultSeason.name);
    }

    // Migrate promo codes without seasonId
    const codesWithoutSeason = await PromoCode.countDocuments({
      seasonId: { $exists: false },
    });
    console.log(`📊 Promo codes without season: ${codesWithoutSeason}`);

    if (codesWithoutSeason > 0) {
      const result = await PromoCode.updateMany(
        { seasonId: { $exists: false } },
        { $set: { seasonId: defaultSeason._id } }
      );
      console.log(`✅ Migrated ${result.modifiedCount} promo codes`);
    }

    // Migrate usage records without seasonId
    const usageWithoutSeason = await PromoCodeUsage.countDocuments({
      seasonId: { $exists: false },
    });
    console.log(`📊 Usage records without season: ${usageWithoutSeason}`);

    if (usageWithoutSeason > 0) {
      const result = await PromoCodeUsage.updateMany(
        { seasonId: { $exists: false } },
        { $set: { seasonId: defaultSeason._id } }
      );
      console.log(`✅ Migrated ${result.modifiedCount} usage records`);
    }

    // Summary
    const totalSeasons = await Season.countDocuments();
    const totalCodes = await PromoCode.countDocuments();
    const totalUsage = await PromoCodeUsage.countDocuments();

    console.log("\n📊 Summary:");
    console.log(`   Seasons: ${totalSeasons}`);
    console.log(`   Promo Codes: ${totalCodes}`);
    console.log(`   Usage Records: ${totalUsage}`);
    console.log("\n✅ Setup complete!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup error:", error);
    process.exit(1);
  }
}

setupSeasons();
