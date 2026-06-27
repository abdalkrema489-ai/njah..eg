// ════════════════════════════════════════
// src/config/mongo.js
// ════════════════════════════════════════
const mongoose = require('mongoose');
const logger   = require('../utils/logger');

async function connectMongo(retries = 5, delay = 5000) {
  if (!process.env.MONGODB_URI) {
    logger.warn('⚠️  MONGODB_URI not set — MongoDB features disabled');
    return;
  }
  for (let i = 1; i <= retries; i++) {
    try {
      logger.info(`MongoDB connection attempt ${i}/${retries}...`);
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      logger.info('✅ MongoDB connected');
      return;
    } catch (err) {
      logger.warn(`⚠️ MongoDB connection attempt ${i} failed: ${err.message}`);
      if (i === retries) {
        throw err;
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

const messageSchema = new mongoose.Schema({
  roomId:    { type: String, required: true, index: true },
  subject:   { type: String, required: true },
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  avatarUrl: String,
  content:   { type: String, required: true },
  type:      { type: String, enum: ['text','file','image','audio','quiz_share'], default: 'text' },
  fileUrl:   String,
  reactions: [{ emoji: String, userId: String }],
  replyTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

const aiConversationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  title:     { type: String, default: 'New Chat' },
  messages:  [{ role: String, content: String, timestamp: { type: Date, default: Date.now } }],
  context:   String,
  fileId:    String,
  language:  { type: String, default: 'en' },
}, { timestamps: true });

const privateMessageSchema = new mongoose.Schema({
  senderId:   { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  content:    { type: String, required: true },
  type:       { type: String, enum: ['text','file','image','audio'], default: 'text' },
  fileUrl:    String,
  status:     { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  edited:     { type: Boolean, default: false },
  replyTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'PrivateMessage' },
}, { timestamps: true });

// Index for conversation retrieval
privateMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

const Message        = mongoose.model('Message',        messageSchema);
const AIConversation = mongoose.model('AIConversation', aiConversationSchema);
const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);

module.exports = { connectMongo, Message, AIConversation, PrivateMessage };
