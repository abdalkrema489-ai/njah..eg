const axios = require('axios');
async function testSearch() {
  try {
    const res = await axios.post('http://localhost:5000/api/ai/search', {
      query: 'What is the capital of Egypt?'
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('ERROR:', err.response ? err.response.data : err.message);
  }
}
testSearch();
