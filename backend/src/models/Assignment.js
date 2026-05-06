'use strict';
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId:      { type: String, required: true },
  studentName:    { type: String },
  content:        { type: String },
  attachmentUrl:  { type: String },   // Firebase Storage URL (not base64)
  attachmentName: { type: String },   // Original filename
  attachmentType: { type: String },   // mime type (e.g., image/jpeg, application/pdf)
  attachmentSize: { type: Number },   // size in bytes
  score:          { type: Number, min: 0 },
  feedback:       { type: String, maxlength: 1000 },
  status:         { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
  submittedAt:    { type: Date, default: Date.now },
  gradedAt:       { type: Date },
}, { _id: true });

const assignmentSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  teacherId:   { type: String, required: true },
  title:       { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 3000 },
  dueDate:     { type: Date },
  maxScore:    { type: Number, default: 100, min: 1 },
  submissions: [submissionSchema],
}, { timestamps: true });

assignmentSchema.index({ groupId: 1, dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
