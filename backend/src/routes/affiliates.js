const express = require('express');
const { authenticate } = require('../middleware/auth');
const Affiliate = require('../models/Affiliate');

const router = express.Router();

// Get teacher's affiliate link stats
router.get('/', authenticate, async (req, res) => {
  try {
    const affiliates = await Affiliate.find({ teacherId: req.user.id });
    res.json({ success: true, data: affiliates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch affiliate data' });
  }
});

// Create a new affiliate link for a teacher
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can create affiliate links' });
    const { code, commissionRate } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const existing = await Affiliate.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Affiliate code already exists' });

    const affiliate = new Affiliate({
      teacherId: req.user.id,
      code: code.toUpperCase(),
      commissionRate: commissionRate || 10 
    });
    await affiliate.save();
    res.json({ success: true, data: affiliate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create affiliate link' });
  }
});

// Register a click on the affiliate link
router.get('/click/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const affiliate = await Affiliate.findOneAndUpdate(
      { code: code.toUpperCase(), isActive: true },
      { $inc: { clicks: 1 } },
      { new: true }
    );
    if (!affiliate) return res.status(404).json({ error: 'Affiliate link not found or inactive' });
    // Redirect to home page with code saved in local storage (client side will handle saving)
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/?ref=${code.toUpperCase()}`);
  } catch (err) {
    res.status(500).json({ error: 'Click tracking error' });
  }
});

// Aggregate affiliate stats for teacher
router.get('/stats', authenticate, async (req, res) => {
  try {
    const affiliates = await Affiliate.find({ teacherId: req.user.id });
    const stats = {
      totalClicks:      affiliates.reduce((a, l) => a + l.clicks, 0),
      totalConversions: affiliates.reduce((a, l) => a + l.conversions, 0),
      totalEarned:      affiliates.reduce((a, l) => a + l.earnedAmount, 0),
      activeLinks:      affiliates.filter(l => l.isActive).length,
    };
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
