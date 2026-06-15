// src/services/emailService.js
'use strict';
const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let transport;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: (process.env.SMTP_PORT || '465') === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
      tls: { rejectUnauthorized: false },
    });
  }
  return transport;
}

const BASE = `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#6C63FF,#4F46E5);padding:32px 36px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">🎓</div>
    <div style="color:#fff;font-size:22px;font-weight:700">Najah Platform</div>
  </div>
  <div style="padding:36px">{{CONTENT}}</div>
  <div style="background:#f8f7ff;padding:20px;text-align:center;font-size:12px;color:#888">
    منصة نجاح للتعليم المصري · Najah Egyptian Education Platform<br/>
    <a href="https://najah.edu.eg" style="color:#6C63FF">najah.edu.eg</a>
  </div>
</div>`;

const TEMPLATES = {
  verify: ({ name, verifyToken }) => ({
    subject: 'تفعيل حسابك في منصة نجاح ✉️',
    html: BASE.replace('{{CONTENT}}', `
      <h2 style="color:#1a1830;margin:0 0 12px">أهلاً، ${name}! 👋</h2>
      <p style="color:#4a4875;line-height:1.7">شكراً لتسجيلك في منصة نجاح. يرجى تفعيل بريدك الإلكتروني للبدء:</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${process.env.CLIENT_URL}/verify/${verifyToken}"
           style="background:#6C63FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          تفعيل الحساب →
        </a>
      </div>
      <p style="color:#888;font-size:13px">الرابط صالح لمدة 24 ساعة. إذا لم تقم بإنشاء حساب، تجاهل هذا البريد.</p>
    `),
  }),

  reset: ({ name, resetToken }) => ({
    subject: 'إعادة تعيين كلمة المرور 🔑',
    html: BASE.replace('{{CONTENT}}', `
      <h2 style="color:#1a1830;margin:0 0 12px">مرحباً ${name}</h2>
      <p style="color:#4a4875;line-height:1.7">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك:</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${process.env.CLIENT_URL}/reset-password/${resetToken}"
           style="background:#FF5470;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          إعادة تعيين كلمة المرور →
        </a>
      </div>
      <p style="color:#888;font-size:13px">الرابط صالح لساعة واحدة. إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
    `),
  }),

  reminder: ({ name, sessionSubject, sessionTime }) => ({
    subject: `⏰ تذكير: جلسة ${sessionSubject} تبدأ قريباً`,
    html: BASE.replace('{{CONTENT}}', `
      <h2 style="color:#1a1830;margin:0 0 12px">تذكير دراسي ⏰</h2>
      <p style="color:#4a4875;line-height:1.7">مرحباً ${name}،</p>
      <p style="color:#4a4875;line-height:1.7">جلسة <strong>${sessionSubject}</strong> ستبدأ الساعة <strong>${sessionTime}</strong>. استعد!</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.CLIENT_URL}/planner"
           style="background:#6C63FF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
          فتح المخطط →
        </a>
      </div>
    `),
  }),

  welcome: ({ name, grade }) => ({
    subject: `مرحباً بك في منصة نجاح 🎓`,
    html: BASE.replace('{{CONTENT}}', `
      <h2 style="color:#1a1830;margin:0 0 12px">أهلاً ${name}! 🎉</h2>
      <p style="color:#4a4875;line-height:1.7">يسعدنا انضمامك إلى منصة نجاح — منصتك التعليمية الشاملة لطلاب المدارس المصرية.</p>
      <p style="color:#4a4875;line-height:1.7">لقد تم تسجيلك في الصف: <strong>${grade || 'غير محدد'}</strong></p>
      <div style="background:#f8f7ff;border-radius:10px;padding:20px;margin:20px 0">
        <div style="font-weight:600;margin-bottom:12px;color:#1a1830">🚀 ابدأ رحلتك:</div>
        <ul style="color:#4a4875;padding-right:20px;line-height:2">
          <li>📅 خطط لجلساتك الدراسية</li>
          <li>🤖 استخدم المساعد الذكي</li>
          <li>📁 ارفع ملفاتك ومذكراتك</li>
          <li>💬 تواصل مع زملائك</li>
        </ul>
      </div>
      <div style="text-align:center">
        <a href="${process.env.CLIENT_URL}"
           style="background:#6C63FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          ابدأ الآن →
        </a>
      </div>
    `),
  }),
};

async function sendEmail({ to, template, data = {}, subject: subj, html: customHtml }) {
  try {
    const content = template ? TEMPLATES[template](data) : { subject: subj, html: customHtml };

    await getTransport().sendMail({ from: process.env.EMAIL_FROM, to, ...content });
    logger.info(`Email → ${to}: ${content.subject}`);
  } catch (err) {
    logger.error(`Email failed → ${to}: ${err.message}`);
  }
}

module.exports = { sendEmail };
