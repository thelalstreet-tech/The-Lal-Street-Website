// server/scripts/migrateSuggestedBuckets.js
// Migration script to move suggested buckets from JSON file to MongoDB
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SuggestedBucket = require('../models/SuggestedBucket');

const BUCKETS_FILE_PATH = path.join(__dirname, '../data/suggestedBuckets.json');

async function migrateSuggestedBuckets() {
  try {
    // Connect to MongoDB using the same method as server
    const connectDB = require('../config/database');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if file exists
    let fileData = [];
    try {
      const fileContent = await fs.readFile(BUCKETS_FILE_PATH, 'utf8');
      fileData = JSON.parse(fileContent);
      console.log(`📄 Found ${fileData.length} buckets in JSON file`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📄 No JSON file found, starting with empty database');
      } else {
        throw error;
      }
    }

    // Check existing buckets in database
    const existingBuckets = await SuggestedBucket.find({});
    console.log(`💾 Found ${existingBuckets.length} buckets in database`);

    if (existingBuckets.length > 0 && fileData.length > 0) {
      console.log('⚠️  Database already has buckets. Migration will skip duplicates.');
    }

    // Migrate buckets from file to database
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const bucketData of fileData) {
      try {
        // Check if bucket already exists (by name or old id)
        const existing = await SuggestedBucket.findOne({
          $or: [
            { name: bucketData.name },
            // If old id format exists, we can't match by MongoDB _id, so skip
          ]
        });

        if (existing) {
          console.log(`⏭️  Skipping duplicate bucket: ${bucketData.name}`);
          skipped++;
          continue;
        }

        // Remove old id field (MongoDB will generate _id)
        const { id, ...bucketWithoutId } = bucketData;

        // Create new bucket
        const newBucket = new SuggestedBucket(bucketWithoutId);
        await newBucket.save();

        console.log(`✅ Migrated bucket: ${bucketData.name} (${newBucket._id})`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating bucket ${bucketData.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   💾 Total in database: ${await SuggestedBucket.countDocuments()}`);

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Migration completed and connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateSuggestedBuckets()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrateSuggestedBuckets };

