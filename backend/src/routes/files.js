// src/routes/files.js  — FIXED: uploadLimiter from rateLimiter.js (not upload.js)
'use strict';
const router = require('express').Router();
const fc     = require('../controllers/filesController');
const { authenticate }               = require('../middleware/auth');
const { uploadSingle }               = require('../middleware/upload');
const { uploadLimiter }              = require('../middleware/rateLimiter');

router.use(authenticate);

router.get ('/',            fc.listFiles);
router.post('/',            uploadLimiter, uploadSingle, fc.uploadFile);
router.get ('/:id',         fc.getFile);
router.patch('/:id',        fc.updateFile);
router.delete('/:id',       fc.deleteFile);
router.get ('/:id/extract', fc.extractPdfText);

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

router.post('/:id/summary-pdf', async (req, res) => {
  try {
    const { summaryText, fileName } = req.body;
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = (fileName || 'summary').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-summary.pdf"`);
    doc.pipe(res);

    const fontDir = path.join(__dirname, '../assets/fonts');
    if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });
    const fontPath = path.join(fontDir, 'Cairo-Regular.ttf');
    
    if (!fs.existsSync(fontPath)) {
      try {
        const response = await axios({
          url: 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bwdth%2Cwght%5D.ttf',
          method: 'GET',
          responseType: 'stream'
        });
        await new Promise((resolve, reject) => {
          response.data.pipe(fs.createWriteStream(fontPath))
            .on('finish', resolve)
            .on('error', reject);
        });
      } catch (err) {
        console.error('Failed to download Cairo font:', err.message);
      }
    }

    doc.fillColor('#1E1B4B').fontSize(18);
    
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      doc.font('Helvetica');
    }
    
    const isArabic = /[\u0600-\u06FF]/.test(summaryText || '');
    
    if (isArabic) {
      doc.text('منصة نجاح - ملخص الملف', { align: 'right' });
      doc.moveDown();
      doc.fillColor('#4B5563').fontSize(12);
      doc.text(fileName || 'بدون عنوان', { align: 'right' });
      doc.moveDown();
      doc.fillColor('#1F2937').fontSize(11);
      
      const paras = (summaryText || '').split('\n');
      for (const para of paras) {
        if (para.trim()) {
          doc.text(para, { align: 'right', lineGap: 4 });
        } else {
          doc.moveDown(0.5);
        }
      }
    } else {
      doc.text('Najah Platform - File Summary', { align: 'left' });
      doc.moveDown();
      doc.fillColor('#4B5563').fontSize(12);
      doc.text(fileName || 'Untitled', { align: 'left' });
      doc.moveDown();
      doc.fillColor('#1F2937').fontSize(11);
      doc.text(summaryText || '', { align: 'left', lineGap: 4 });
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
});

module.exports = router;
