const mongoose = require('mongoose');
const uri = "mongodb://najah_user:NajahUser2026Password!@ac-flgptfc-shard-00-00.wedambh.mongodb.net:27017,ac-flgptfc-shard-00-01.wedambh.mongodb.net:27017,ac-flgptfc-shard-00-02.wedambh.mongodb.net:27017/najah_chat?ssl=true&authSource=admin";

async function test() {
  console.log("Connecting directly without replicaSet option...");
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Success! Connected!");
  } catch (err) {
    console.error("❌ Failed with error:", err);
  }
  process.exit(0);
}
test();
