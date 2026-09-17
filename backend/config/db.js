const mongoose = require('mongoose');

let retryTimer = null;

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log(`💡 TIP: To connect MongoDB:`);
    console.log(`   1. Set MONGO_URI in 'backend/.env' to your MongoDB Atlas cloud cluster (mongodb+srv://...), OR`);
    console.log(`   2. Start MongoDB Community Server locally.\n`);

    // Auto-retry connection every 10 seconds in background
    if (!retryTimer) {
      retryTimer = setInterval(() => {
        if (mongoose.connection.readyState === 0) {
          connectDB();
        }
      }, 10000);
    }
  }
};

module.exports = connectDB;
