require('dotenv').config({ path: '.env' });
const geminiAI = require('./src/services/geminiAI');

async function test() {
  try {
    const res = await geminiAI.searchAndAnswer('What is the capital of Egypt?');
    console.log(res);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
