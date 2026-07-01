// src/middleware/upload.js
// File upload with MIME allowlist + magic-byte verification to prevent content-type spoofing.
// file-type@16 is pinned because v17+ is ESM-only; this backend uses CJS throughout.
const multer    = require('multer');
const logger    = require('../utils/logger');

const ALLOWED = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  // Audio (for voice messages)
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a',
  'audio/aac': 'aac', 'audio/x-m4a': 'm4a',
  // Video
  'video/webm': 'webm', 'video/mp4': 'mp4',
  // Documents
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
};

const ALLOWED_MSG = 'File type not allowed. Allowed: PDF, JPEG, PNG, GIF, WEBP, Audio (WebM/MP3/WAV/OGG), Video (MP4), Documents';

// MIME types where magic-byte detection is unreliable / varies by codec — trust
// the declared MIME for these rather than failing on false negatives.
const SKIP_MAGIC_CHECK = new Set([
  'audio/webm', 'video/webm', 'audio/ogg', 'audio/wav',
  'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/x-m4a', 'audio/mp4',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 200;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new Error(ALLOWED_MSG));
  },
});

const uploadSingle  = upload.single('file');
const uploadAvatar  = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null,true) : cb(new Error('Only images allowed for avatars')),
}).single('avatar');

/**
 * Magic-byte validation middleware — run AFTER multer has buffered the file.
 * Rejects uploads where the actual byte signature contradicts the declared MIME type.
 * Skips checks for formats where magic-byte detection is unreliable.
 */
async function validateFileMagicBytes(req, res, next) {
  if (!req.file) return next(); // no file — let route handle it

  const declared = req.file.mimetype;

  // Skip unreliable-detection types
  if (SKIP_MAGIC_CHECK.has(declared)) return next();

  try {
    const { fileTypeFromBuffer } = require('file-type');
    const detected = await fileTypeFromBuffer(req.file.buffer);

    if (!detected) {
      // Could not detect — only block if we declared a type that SHOULD be detectable
      if (['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(declared)) {
        logger.warn(`[Upload] Magic-byte check failed: no signature detected, declared=${declared}, ip=${req.ip}`);
        return res.status(400).json({ error: 'File content does not match the declared type' });
      }
      return next(); // unknown but allowed type — pass through
    }

    // Map detected type to canonical MIME for comparison
    const detectedMime = detected.mime;
    // Allow minor MIME variants (e.g. image/jpg === image/jpeg)
    const normalise = m => m.replace('image/jpg', 'image/jpeg');
    if (normalise(detectedMime) !== normalise(declared)) {
      logger.warn(
        `[Upload] Magic-byte MIME mismatch: declared=${declared}, detected=${detectedMime}, ip=${req.ip}`
      );
      return res.status(400).json({
        error: `File content mismatch: declared ${declared} but detected ${detectedMime}`,
      });
    }

    next();
  } catch (err) {
    // If file-type package fails for any reason, log and pass through rather than
    // blocking legitimate uploads — magic-byte check is defence-in-depth, not primary gate
    logger.warn('[Upload] Magic-byte check error (non-fatal):', err.message);
    next();
  }
}

module.exports = { upload, uploadSingle, uploadAvatar, validateFileMagicBytes, ALLOWED };
