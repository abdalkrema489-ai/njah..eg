const mongoose = require('mongoose');
const uri = "mongodb+srv://najah_user:NajahUser2026Password!@najah-cluster.wedambh.mongodb.net/najah_chat?retryWrites=true&w=majority&appName=najah-cluster";

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
