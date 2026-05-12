'use strict';
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const Group        = require('../models/Group');
const Announcement = require('../models/Announcement');
const Assignment   = require('../models/Assignment');

// Simple in-process auth middleware (re-uses the JWT from the auth routes)
const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'najah_secret';

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(h.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function teacherOnly(req, res, next) {
  if (req.user?.role !== 'teacher') return res.status(403).json({ error: 'Teachers only' });
  next();
}

async function ownerOnly(req, res, next) {
  try {
    const groupId = req.params.id || req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const uid = req.user.id || req.user.userId;
    if (String(group.teacherId) !== String(uid)) return res.status(403).json({ error: 'Forbidden. Only the group teacher can perform this action.' });
    req.group = group; // Pass it along to save a DB call if needed
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error check ownership' });
  }
}

// ── Helper: generate unique 6-char code ──────────────────────
async function uniqueCode() {
  let code, exists = true;
  while (exists) {
    code = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X').slice(0, 6);
    exists = await Group.exists({ code });
  }
  return code;
}

/* ═══════════════════════════════════════════════════════
   GROUPS
═══════════════════════════════════════════════════════ */

// POST /api/groups  — create group (paid groups start as pending_payment)
router.post('/', auth, async (req, res) => {
  const { name, description, subject, grade, institutionType, institution, maxStudents, color, emoji, privacy, isPaid, price, curriculumLinked } = req.body;
  if (!name || !subject) return res.status(400).json({ error: 'Name and subject are required' });

  const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
  const paidGroup  = !!(isPaid && parseFloat(price) > 0);

  const code  = await uniqueCode();
  const group = await Group.create({
    name, description, subject, grade, code,
    institutionType: institutionType || 'school',
    institution,
    maxStudents: maxStudents || 50,
    color: color || '#7C3AED',
    emoji: emoji || '📚',
    privacy: privacy || 'public',
    isPaid: paidGroup,
    price: paidGroup ? parseFloat(price) : 0,
    platformFeePercent: feePercent,
    // Paid groups start pending until teacher completes listing-fee payment
    status: paidGroup ? 'pending_payment' : 'active',
    listingFeePaid: !paidGroup, // free groups are immediately active
    curriculumLinked: curriculumLinked || null,
    teacherId:   req.user.id || req.user.userId,
    teacherName: req.user.name || '',
  });

  // Calculate listing fee (5% of expected first 10 students)
  const listingFee = paidGroup ? Math.max(10, Math.round(parseFloat(price) * 0.05)) : 0;

  res.status(201).json({
    group,
    requiresPayment: paidGroup,
    listingFee,
    platformFeePercent: feePercent,
    message: paidGroup
      ? `Group created. Pay the EGP ${listingFee} listing fee to activate it.`
      : 'Group created and active.',
  });
});

// POST /api/groups/:id/activate  — teacher pays listing fee → group goes live
router.post('/:id/activate', auth, async (req, res) => {
  try {
    const { gateway = 'instapay', phone } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const uid = req.user.id || req.user.userId;
    if (String(group.teacherId) !== String(uid))
      return res.status(403).json({ error: 'Only the group owner can activate it' });

    if (group.listingFeePaid)
      return res.status(409).json({ error: 'Group is already active' });

    const Transaction = require('../models/Transaction');
    const listingFee  = Math.max(10, Math.round(group.price * 0.05));

    // Create the listing-fee transaction record
    const tx = await Transaction.create({
      userId:   uid,
      group:    group._id,
      amount:   listingFee,
      gateway:  gateway,
      orderId:  'LISTING_' + group._id,
      type:     'one_time',
      metadata: { title: `Listing fee – ${group.name}`, listingFee: true },
    });

    // Immediately mark as paid (real gateway would use webhook)
    tx.status = 'success';
    await tx.save();

    group.status             = 'active';
    group.listingFeePaid     = true;
    group.listingFeeTransactionId = tx._id.toString();
    await group.save();

    res.json({ success: true, group, transactionId: tx._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups  — teacher: own groups | student: joined groups
router.get('/', auth, async (req, res) => {
  const uid = req.user.id || req.user.userId;

  let groups;
  if (req.user.role === 'teacher') {
    groups = await Group.find({ teacherId: uid, isActive: true }).sort({ createdAt: -1 });
  } else {
    groups = await Group.find({ 
      $or: [ { 'students.userId': uid }, { teacherId: uid } ],
      isActive: true 
    }).sort({ createdAt: -1 });
  }

  res.json({ groups });
});

// GET /api/groups/:id
router.get('/:id', auth, async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const uid = req.user.id || req.user.userId;
  const isMember = group.teacherId === uid || group.students.some(s => s.userId === uid);
  if (!isMember) return res.status(403).json({ error: 'Forbidden. You must be a member or teacher of this group to view its details.' });

  res.json({ group });
});

// POST /api/groups/join  — student joins by code
router.post('/join', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Invite code required' });

  const group = await Group.findOne({ code: code.toUpperCase(), isActive: true });
  if (!group) return res.status(404).json({ error: 'Invalid invite code' });

  const uid = req.user.id || req.user.userId;
  if (group.students.some(s => s.userId === uid))
    return res.status(409).json({ error: 'Already a member of this group' });

  if (group.students.length >= group.maxStudents)
    return res.status(400).json({ error: 'Group is full' });

  // If group is paid, redirect to payment flow before joining
  if (group.isPaid && group.price > 0) {
    return res.status(402).json({
      error: 'Payment required to join this group.',
      requiresPayment: true,
      groupId: group._id,
      price: group.price
    });
  }

  group.students.push({
    userId:   uid,
    name:     req.user.name || '',
    email:    req.user.email || '',
    joinedAt: new Date(),
  });
  await group.save();

  res.json({ group });
});

// DELETE /api/groups/:id/members/:userId  — owner removes a student
router.delete('/:id/members/:userId', auth, ownerOnly, async (req, res) => {
  const group = req.group;
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.teacherId !== (req.user.id || req.user.userId))
    return res.status(403).json({ error: 'Forbidden' });

  group.students = group.students.filter(s => s.userId !== req.params.userId);
  await group.save();
  res.json({ ok: true });
});

// DELETE /api/groups/:id  — owner deletes group
router.delete('/:id', auth, ownerOnly, async (req, res) => {
  const group = req.group;
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (String(group.teacherId) !== String(req.user.id || req.user.userId))
    return res.status(403).json({ error: 'Forbidden' });

  group.isActive = false;
  await group.save();
  res.json({ ok: true });
});

// PATCH /api/groups/:id  — owner updates group
router.patch('/:id', auth, ownerOnly, async (req, res) => {
  const group = req.group;
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (String(group.teacherId) !== String(req.user.id || req.user.userId))
    return res.status(403).json({ error: 'Forbidden' });

  const allowed = ['name', 'description', 'subject', 'maxStudents', 'color', 'emoji', 'coverImage'];
  allowed.forEach(k => { if (req.body[k] != null) group[k] = req.body[k]; });
  await group.save();
  res.json({ group });
});

/* ═══════════════════════════════════════════════════════
   ANNOUNCEMENTS
═══════════════════════════════════════════════════════ */

// POST /api/groups/:id/announcements
router.post('/:id/announcements', auth, ownerOnly, async (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  const ann = await Announcement.create({
    groupId:     req.params.id,
    teacherId:   req.user.id || req.user.userId,
    teacherName: req.user.name || '',
    title, body,
    pinned: pinned || false,
  });
  res.status(201).json({ announcement: ann });
});

// GET /api/groups/:id/announcements
router.get('/:id/announcements', auth, async (req, res) => {
  const anns = await Announcement.find({ groupId: req.params.id })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(50);
  res.json({ announcements: anns });
});

// PATCH /api/groups/:groupId/announcements/:annId/pin
router.patch('/:groupId/announcements/:annId/pin', auth, ownerOnly, async (req, res) => {
  const ann = await Announcement.findById(req.params.annId);
  if (!ann) return res.status(404).json({ error: 'Announcement not found' });
  ann.pinned = !ann.pinned;
  await ann.save();
  res.json({ announcement: ann });
});

// DELETE /api/groups/:groupId/announcements/:annId
router.delete('/:groupId/announcements/:annId', auth, ownerOnly, async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.annId);
  res.json({ ok: true });
});

/* ═══════════════════════════════════════════════════════
   ASSIGNMENTS
═══════════════════════════════════════════════════════ */

// POST /api/groups/:id/assignments
router.post('/:id/assignments', auth, ownerOnly, async (req, res) => {
  const { title, description, dueDate, maxScore } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const assignment = await Assignment.create({
    groupId:   req.params.id,
    teacherId: req.user.id || req.user.userId,
    title, description,
    dueDate:  dueDate ? new Date(dueDate) : undefined,
    maxScore: maxScore || 100,
  });
  res.status(201).json({ assignment });
});

// GET /api/groups/:id/assignments
router.get('/:id/assignments', auth, async (req, res) => {
  const assignments = await Assignment.find({ groupId: req.params.id })
    .sort({ dueDate: 1, createdAt: -1 });
  res.json({ assignments });
});

// POST /api/groups/:id/assignments/:aId/submit  — student submits
router.post('/:id/assignments/:aId/submit', auth, async (req, res) => {
  const { content, attachmentUrl, attachmentName, attachmentType, attachmentSize } = req.body;
  const assignment = await Assignment.findById(req.params.aId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const uid = req.user.id || req.user.userId;
  const existing = assignment.submissions.find(s => s.studentId === uid);
  if (existing) {
    existing.content        = content;
    existing.attachmentUrl  = attachmentUrl  || null;
    existing.attachmentName = attachmentName || null;
    existing.attachmentType = attachmentType || null;
    existing.attachmentSize = attachmentSize || null;
    existing.submittedAt    = new Date();
    existing.status         = assignment.dueDate && new Date() > assignment.dueDate ? 'late' : 'submitted';
  } else {
    assignment.submissions.push({
      studentId:      uid,
      studentName:    req.user.name || '',
      content,
      attachmentUrl:  attachmentUrl  || null,
      attachmentName: attachmentName || null,
      attachmentType: attachmentType || null,
      attachmentSize: attachmentSize || null,
      status: assignment.dueDate && new Date() > assignment.dueDate ? 'late' : 'submitted',
    });
  }
  await assignment.save();
  res.json({ ok: true });
});

// PATCH /api/groups/:id/assignments/:aId/submissions/:sId  — owner grades
router.patch('/:id/assignments/:aId/submissions/:sId', auth, ownerOnly, async (req, res) => {
  const { score, feedback } = req.body;
  const assignment = await Assignment.findById(req.params.aId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const sub = assignment.submissions.id(req.params.sId);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  sub.score    = score;
  sub.feedback = feedback;
  sub.status   = 'graded';
  sub.gradedAt = new Date();
  await assignment.save();

  // Notify the student that their work has been graded
  try {
    const { pool } = require('../config/postgres');
    const { pushNotification } = require('../config/socket');
    const notifTitle = '📊 تم تصحيح واجبك';
    const notifBody  = `حصلت على ${score} من ${assignment.maxScore} في واجب "${assignment.title}"`;
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'grade', $2, $3, $4)`,
      [sub.studentId, notifTitle, notifBody, JSON.stringify({ assignmentId: assignment._id, groupId: req.params.id, score, maxScore: assignment.maxScore })]
    );
    pushNotification(sub.studentId, { type: 'grade', title: notifTitle, body: notifBody });
  } catch (notifErr) {
    // Non-fatal: grading succeeded even if notification fails
    console.error('[Grading] Notification error:', notifErr.message);
  }

  res.json({ ok: true });
});

/* ═══════════════════════════════════════════════════════
   SUBMISSION STATUS (teacher only)
═══════════════════════════════════════════════════════ */

// GET /api/groups/:id/assignments/:aId/status  — who submitted vs who hasn't
router.get('/:id/assignments/:aId/status', auth, ownerOnly, async (req, res) => {
  try {
    const group = req.group;
    const assignment = await Assignment.findById(req.params.aId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const submittedIds = new Set(assignment.submissions.map(s => s.studentId));

    const submitted = assignment.submissions.map(s => ({
      studentId:   s.studentId,
      studentName: s.studentName,
      status:      s.status,
      score:       s.score,
      submittedAt: s.submittedAt,
      hasAttachment: !!s.attachmentUrl,
    }));

    const notSubmitted = group.students
      .filter(s => !submittedIds.has(s.userId))
      .map(s => ({ studentId: s.userId, studentName: s.name, email: s.email }));

    res.json({ submitted, notSubmitted, totalStudents: group.students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════
   INSIGHTS (teacher only)
═══════════════════════════════════════════════════════ */

// GET /api/groups/:id/insights
router.get('/:id/insights', auth, ownerOnly, async (req, res) => {
  const group = req.group;
  if (!group) return res.status(404).json({ error: 'Not found' });

  const assignments = await Assignment.find({ groupId: req.params.id });
  const totalStudents = group.students.length;

  let totalSubmissions = 0;
  let gradedSubmissions = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  assignments.forEach(a => {
    totalSubmissions += a.submissions.length;
    a.submissions.forEach(s => {
      if (s.status === 'graded') {
        gradedSubmissions++;
        scoreSum  += (s.score / a.maxScore) * 100;
        scoreCount++;
      }
    });
  });

  res.json({
    insights: {
      totalStudents,
      totalAssignments:    assignments.length,
      avgScore:            scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      submissionRate:      assignments.length > 0 && totalStudents > 0
        ? Math.round((totalSubmissions / (assignments.length * totalStudents)) * 100)
        : 0,
    }
  });
});

// POST /api/groups/:id/broadcast
router.post('/:id/broadcast', auth, ownerOnly, async (req, res) => {
  try {
    const { message, type = 'announcement' } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:'Message required' });
    if (message.length > 500) return res.status(400).json({ error:'Max 500 characters' });

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error:'Group not found' });

    const students = group.students || [];
    if (!students.length) return res.json({ success:true, sent:0 });

    const typeIcon = { announcement:'📢', reminder:'🔔', important:'⚠️' };
    const icon     = typeIcon[type] || '📢';
    const title    = `${icon} ${group.name}`;

    const { pool } = require('../config/postgres');
    const { pushNotification } = require('../config/socket');
    const logger = require('../utils/logger');

    // Insert notifications safely using parameterized queries
    for (const s of students) {
      await pool.query(
        `INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'broadcast',$2,$3)`,
        [s.userId, title, message]
      ).catch(() => {});
    }

    let sent = 0;
    for (const s of students) {
      try {
        await pushNotification(s.userId, { type:'broadcast', title, body: message, groupId: group._id });
        sent++;
      } catch {}
    }

    logger.info(`Broadcast sent to ${sent} students in group ${group._id}`);
    res.json({ success:true, sent, total: students.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/groups/:id/leaderboard
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error:'Not found' });

    const studentIds = (group.students || []).map(s => s.userId);
    if (!studentIds.length) return res.json({ leaderboard:[] });

    const { pool } = require('../config/postgres');
    // XP هذا الأسبوع من quiz_attempts
    const { rows } = await pool.query(`
      SELECT
        u.id::text   AS user_id,
        u.name,
        u.level,
        COUNT(qa.id)::int                                    AS quizzes_this_week,
        COALESCE(SUM(qa.score_pct),0)::int                   AS weekly_xp,
        COALESCE(AVG(qa.score_pct),0)::int                   AS avg_score
      FROM users u
      LEFT JOIN quiz_attempts qa ON qa.user_id=u.id
        AND qa.created_at >= NOW()-INTERVAL '7 days'
      WHERE u.id::text = ANY($1::text[])
      GROUP BY u.id, u.name, u.level
      ORDER BY weekly_xp DESC, avg_score DESC
      LIMIT 10
    `, [studentIds]);

    const leaderboard = rows.map((r, i) => ({ ...r, rank: i+1 }));
    res.json({ leaderboard, period:'weekly', updatedAt: new Date() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
