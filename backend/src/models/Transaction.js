const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  userRole:       { type: String, enum: ['student', 'teacher', 'center_owner'], default: 'student' },

  // نوع العملية
  type: {
    type: String,
    enum: [
      'group_join',        // طالب يشترك في مجموعة
      'wallet_topup',      // طالب يشحن محفظته
      'listing_fee',       // مدرس يدفع رسوم نشر مجموعة
      'subscription',      // اشتراك شهري في المنصة
      'withdrawal',        // سحب أرباح (tracked فقط)
      'one_time',          // legacy
    ],
    default: 'one_time',
  },

  group:          { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: false },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'EGP' },
  gateway:        { type: String, enum: ['card', 'instapay', 'fawry', 'wallet', 'vodafone_cash', 'internal'], required: true },
  status:         { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  orderId:        { type: String, required: true },
  transactionId:  { type: String },
  referenceCode:  { type: String },

  // Platform fee tracking (auto-calculated)
  platformFeePercent: { type: Number },
  platformFeeAmount:  { type: Number, default: 0 },
  teacherPayout:      { type: Number, default: 0 },

  affiliateRef:        { type: String, index: true },
  affiliateCommission: { type: Number, default: 0 },

  metadata:       { type: Object, default: {} },
}, { timestamps: true });

// Auto-compute fee fields for group_join transactions
transactionSchema.pre('save', function(next) {
  if (this.type === 'group_join' && this.isNew) {
    const fee = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    this.platformFeePercent = fee;
    this.platformFeeAmount  = parseFloat((this.amount * fee / 100).toFixed(2));
    this.teacherPayout      = parseFloat((this.amount - this.platformFeeAmount).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
