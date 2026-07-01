// src/config/socket.js
const jwt    = require('jsonwebtoken');
const { pool } = require('./postgres');
const { Message, PrivateMessage } = require('./mongo');
const geminiAI = require('../services/geminiAI');
const internalAI = require('../services/internalAI');
const { cacheGet, cacheSet } = require('./redis');
const { sendPush } = require('../services/pushService');
const logger = require('../utils/logger');
const axios = require('axios');

let ioInstance;

function setupSocketIO(io) {
  ioInstance = io;

  // JWT auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await pool.query(
        'SELECT id,name,email,avatar_url,grade,role FROM users WHERE id=$1 AND is_active=true',
        [decoded.id]
      );
      if (!rows[0]) return next(new Error('User not found'));
      socket.user = rows[0];
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') next(new Error('Token expired — please refresh'));
      else next(new Error('Invalid token'));
    }
  });

  io.on('connection', socket => {
    logger.info(`Socket: ${socket.user.name} connected`);

    // Join user's private room for notifications
    socket.join(`user:${socket.user.id}`);

    socket.on('join_room', ({ subject }) => {
      const room = `room:${subject.toLowerCase()}`;
      socket.join(room);
      socket.currentRoom = room;
      socket.to(room).emit('user_joined', {
        userId: socket.user.id, name: socket.user.name,
        avatarUrl: socket.user.avatar_url, timestamp: new Date(),
      });
    });

    socket.on('leave_room', ({ subject }) => {
      socket.leave(`room:${subject.toLowerCase()}`);
    });

    socket.on('join_admin_room', () => {
      if (socket.user?.role === 'platform_owner') {
        socket.join('admin_dashboard');
        logger.info(`Admin joined admin_dashboard room: ${socket.user.name}`);
      }
    });

    socket.on('send_message', async ({ subject, content, type = 'text', fileUrl, replyTo }) => {
      // Block guest accounts from sending persistent content
      if (socket.user?.email?.endsWith('@guest.najah.local')) {
        return socket.emit('error', {
          message: 'يجب إنشاء حساب لإرسال الرسائل. التسجيل مجاني ويستغرق دقيقة واحدة.',
          code: 'GUEST_RESTRICTED'
        });
      }
      if (!content?.trim() && type === 'text') return;
      const roomId = `room:${subject.toLowerCase()}`;
      try {
        const msg = await Message.create({
          roomId, subject,
          userId: socket.user.id, userName: socket.user.name,
          avatarUrl: socket.user.avatar_url, content, type, fileUrl, replyTo,
        });
        io.to(roomId).emit('new_message', {
          id: msg._id, roomId, userId: socket.user.id,
          userName: socket.user.name, avatarUrl: socket.user.avatar_url,
          content, type, fileUrl, replyTo, createdAt: msg.createdAt,
        });
        // +5 XP for chat participation — batched via Redis to avoid per-message DB writes
        try {
          const pendingKey = `xp_pending:${socket.user.id}`;
          const current = await cacheGet(pendingKey) || 0;
          await cacheSet(pendingKey, parseInt(current) + 5, 300); // flush every 5 min via cron
        } catch {}

        // ── Inline @AI processing ──
        if (type === 'text' && content.toLowerCase().includes('@ai')) {
          setTimeout(async () => {
             try {
               // Show AI is typing...
               io.to(roomId).emit('ai_typing', { isTyping: true });
               
               let aiResponse;
               const prompt = content.replace(/@ai/gi, '').trim();
               
               if (geminiAI.isAvailable()) {
                 aiResponse = await geminiAI.chat(prompt, [], 'en').catch(() => null);
               }
               if (!aiResponse) {
                 aiResponse = internalAI.generateChatResponse(prompt, [], 'en');
               }

               const aiMsg = await Message.create({
                 roomId, subject, 
                 userId: '00000000-0000-0000-0000-000000000000', userName: 'Najah AI',
                 avatarUrl: '/icon.png', content: aiResponse, type: 'text', fileUrl: null, replyTo: msg._id
               });

               io.to(roomId).emit('new_message', {
                 id: aiMsg._id, roomId, userId: '00000000-0000-0000-0000-000000000000',
                 userName: 'Najah AI', avatarUrl: '/icon.png',
                 content: aiResponse, type: 'text', fileUrl: null, replyTo: msg._id, createdAt: aiMsg.createdAt,
               });
             } catch (err) {
               logger.warn('Inline @AI failed:', err);
             } finally {
               io.to(roomId).emit('ai_typing', { isTyping: false });
             }
          }, 100);
        }

      } catch (err) {
        socket.emit('error', { message: 'Message failed' });
        logger.error('send_message:', err);
      }
    });

    // ── Private Messaging (WhatsApp Protocol) ──
    socket.on('send_private_message', async ({ receiverId, content, type = 'text', fileUrl }) => {
      // Block guest accounts from sending private messages
      if (socket.user?.email?.endsWith('@guest.najah.local')) {
        return socket.emit('error', {
          message: 'يجب إنشاء حساب لإرسال الرسائل. التسجيل مجاني ويستغرق دقيقة واحدة.',
          code: 'GUEST_RESTRICTED'
        });
      }
      if (!content?.trim() && type === 'text') return;
      try {
        // Automatically mark delivered if the receiver is currently connected to their personal socket room
        const receiverRoom = io.sockets.adapter.rooms.get(`user:${receiverId}`);
        const isOnline = receiverRoom && receiverRoom.size > 0;
        const initStatus = isOnline ? 'delivered' : 'sent';

        const msg = await PrivateMessage.create({
          senderId: socket.user.id,
          receiverId,
          content,
          type,
          fileUrl,
          status: initStatus,
        });
        
        const payload = {
          id: msg._id.toString(),
          senderId: socket.user.id,
          senderName: socket.user.name,
          senderAvatar: socket.user.avatar_url,
          receiverId,
          content,
          type,
          fileUrl,
          status: initStatus,
          createdAt: msg.createdAt,
        };

        io.to(`user:${receiverId}`).emit('new_private_message', payload);
        socket.emit('new_private_message', payload);
        
        const notif = {
          type: 'private_message',
          title: `New message from ${socket.user.name}`,
          body: type === 'text' ? content.slice(0, 100) : `Sent you a ${type}`,
          data: { senderId: socket.user.id },
          action_url: `/chat/private`,
        };

        pool.query(
          `INSERT INTO notifications (user_id, type, title, body, data, action_url) VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
          [receiverId, notif.type, notif.title, notif.body, JSON.stringify(notif.data), notif.action_url]
        ).catch(() => {});

        pushNotification(receiverId, notif);
      } catch (err) {
        logger.error('send_private_message:', err);
      }
    });

    socket.on('fetch_private_history', async ({ targetId, limit = 50 }) => {
      try {
        const msgs = await PrivateMessage.find({
          $or: [
            { senderId: socket.user.id, receiverId: targetId },
            { senderId: targetId, receiverId: socket.user.id }
          ]
        }).sort({ createdAt: -1 }).limit(limit).lean();
        
        socket.emit('private_history', { 
          targetId, 
          messages: msgs.reverse().map(m => ({ ...m, id: m._id.toString() })) 
        });

        // Upon fetching, auto-mark their unread messages to us as 'read'
        const unreadIds = msgs.filter(m => m.senderId === targetId && m.status !== 'read').map(m => m._id);
        if (unreadIds.length > 0) {
          await PrivateMessage.updateMany({ _id: { $in: unreadIds } }, { status: 'read' });
          io.to(`user:${targetId}`).emit('messages_read_by_target', {
            readerId: socket.user.id,
            messageIds: unreadIds.map(id => id.toString())
          });
        }
      } catch (err) {
        logger.error('fetch_private_history:', err);
      }
    });

    socket.on('mark_messages_read', async ({ senderId }) => {
      try {
        await PrivateMessage.updateMany(
          { senderId, receiverId: socket.user.id, status: { $ne: 'read' } },
          { status: 'read' }
        );
        io.to(`user:${senderId}`).emit('messages_read_by_target', {
          readerId: socket.user.id,
          allFromUser: true
        });
      } catch (err) {}
    });

    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        const existing = msg.reactions.find(r => r.userId === socket.user.id && r.emoji === emoji);
        if (existing) {
          msg.reactions = msg.reactions.filter(r => !(r.userId === socket.user.id && r.emoji === emoji));
        } else {
          msg.reactions.push({ emoji, userId: socket.user.id });
        }
        await msg.save();
        io.to(msg.roomId).emit('message_reacted', { messageId, reactions: msg.reactions });
      } catch {}
    });

    socket.on('typing', ({ subject, isTyping }) => {
      const roomId = `room:${subject.toLowerCase()}`;
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id, name: socket.user.name, isTyping,
        roomId,
      });
    });

    // ── Private Typing Indicator ──
    socket.on('private_typing', ({ receiverId, isTyping }) => {
      io.to(`user:${receiverId}`).emit('private_user_typing', {
        senderId: socket.user.id,
        senderName: socket.user.name,
        isTyping,
      });
    });

    // ── Edit Private Message ──
    socket.on('edit_private_message', async ({ messageId, content }) => {
      if (!content?.trim()) return;
      try {
        const msg = await PrivateMessage.findOneAndUpdate(
          { _id: messageId, senderId: socket.user.id },
          { content: content.trim(), edited: true },
          { new: true }
        );
        if (!msg) return socket.emit('error', { message: 'Message not found or unauthorized' });
        const payload = { messageId, content: msg.content, edited: true };
        socket.emit('message_edited', payload);
        io.to(`user:${msg.receiverId}`).emit('message_edited', payload);
      } catch (err) { logger.error('edit_private_message:', err); }
    });

    // ── Delete Private Message ──
    socket.on('delete_private_message', async ({ messageId }) => {
      try {
        const msg = await PrivateMessage.findOneAndDelete({ _id: messageId, senderId: socket.user.id });
        if (!msg) return socket.emit('error', { message: 'Message not found or unauthorized' });
        const payload = { messageId };
        socket.emit('message_deleted', payload);
        io.to(`user:${msg.receiverId}`).emit('message_deleted', payload);
      } catch (err) { logger.error('delete_private_message:', err); }
    });

    // ── WebRTC Voice/Video Call Signaling ──
    // Relay offer to the specific target user
    socket.on('call_offer', async ({ targetId, offer, callType = 'audio' }) => {
      io.to(`user:${targetId}`).emit('call_incoming', {
        callerId:   socket.user.id,
        callerName: socket.user.name,
        callerAvatar: socket.user.avatar_url,
        offer,
        callType,
      });
      // Always send OS push for calls — we can't detect tab visibility server-side.
      // The client suppresses the OS notification itself if the call screen is already active.
      try {
        await sendPush(targetId, {
          title: socket.user.name,
          body: callType === 'video' ? '📹 Incoming video call' : '📞 Incoming call',
          link: '/chat/private',
        });
      } catch {}
    });

    // Relay answer back to caller
    socket.on('call_answer', ({ callerId, answer }) => {
      io.to(`user:${callerId}`).emit('call_answered', {
        answererId: socket.user.id,
        answer,
      });
    });

    // Relay ICE candidates between peers
    socket.on('ice_candidate', ({ targetId, candidate }) => {
      io.to(`user:${targetId}`).emit('ice_candidate', {
        from:      socket.user.id,
        candidate,
      });
    });

    // Relay call end/decline
    socket.on('call_end', ({ targetId }) => {
      io.to(`user:${targetId}`).emit('call_ended', { by: socket.user.id });
    });

    socket.on('call_decline', ({ callerId }) => {
      io.to(`user:${callerId}`).emit('call_declined', { by: socket.user.id });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket: ${socket.user.name} disconnected`);
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user_left', { userId: socket.user.id, name: socket.user.name });
      }
    });
  });

  logger.info('✅ Socket.IO configured');
}

async function pushNotification(userId, notification) {
  if (ioInstance) ioInstance.to(`user:${userId}`).emit('notification', notification);
  await sendPushToUser(userId, notification);
}

async function sendPushToUser(userId, notification) {
  // Delegate to the unified pushService which handles both FCM and web VAPID
  await sendPush(userId, {
    title: notification.title,
    body:  notification.body,
    link:  notification.action_url || notification.data?.link || '/',
  });
}

async function broadcastToRoom(subject, event, data) {
  if (ioInstance) ioInstance.to(`room:${subject.toLowerCase()}`).emit(event, data);
}

async function broadcastToAdmin(event, data) {
  if (ioInstance) ioInstance.to('admin_dashboard').emit(event, data);
}

module.exports = { setupSocketIO, pushNotification, sendPushToUser, broadcastToRoom, broadcastToAdmin };
