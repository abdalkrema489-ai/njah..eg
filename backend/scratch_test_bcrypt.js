const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const hash = process.env.OWNER_PASSWORD_HASH;
console.log('OWNER_PASSWORD_HASH:', hash);
console.log('Hash length:', hash ? hash.length : 0);

const testPasswords = ['Admin@123456', 'admin', 'password', 'password123', 'admin123', 'Najah@2026', 'najah'];
for (const pw of testPasswords) {
  try {
    const match = bcrypt.compareSync(pw, hash);
    if (match) {
      console.log(`MATCH FOUND: Password is "${pw}"`);
    }
  } catch (e) {
    console.error(`Error comparing "${pw}":`, e.message);
  }
}

// Generate new hash for "Admin@123456"
const newHash = bcrypt.hashSync('Admin@123456', 10);
console.log('New hash for "Admin@123456":', newHash);
