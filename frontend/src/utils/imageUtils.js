// src/utils/imageUtils.js — Browser-native image processing (replaces sharp)
'use strict';

/**
 * Resize an image file using the Canvas API (browser-native, no native deps).
 * @param {File} file - The image file to resize
 * @param {number} maxWidth - Maximum width in pixels (default 800)
 * @param {number} quality - WebP quality 0–1 (default 0.85)
 * @returns {Promise<Blob>} Resized image as a WebP blob
 */
export async function resizeImage(file, maxWidth = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio  = Math.min(1, maxWidth / img.width);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob);
          },
          'image/webp',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert a File to a data URL (base64).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
