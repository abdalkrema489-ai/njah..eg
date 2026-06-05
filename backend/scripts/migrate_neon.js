require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { connectPostgres, pool } = require('../src/config/postgres');
const fs = require('fs');
const path = require('path');

connectPostgres()
  .then(async () => {
    console.log('Running teacher ratings migration...');
    const sql = fs.readFileSync(path.join(__dirname,'..','src','migrations','003_teacher_ratings.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Teacher ratings migration done');

    const sql2 = fs.readFileSync(path.join(__dirname,'..','src','migrations','add_performance_indexes.sql'), 'utf8');
    await pool.query(sql2);
    console.log('✅ Performance indexes done');

    const { rows } = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('\n📋 Tables created on Neon:');
    rows.forEach(r => console.log('  -', r.table_name));
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  });
