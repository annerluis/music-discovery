import { query } from './db.js';

(async () => {
  try {
    const res = await query('SELECT NOW() AS current_time');
    console.log('Connected! Time on DB:', res.rows[0].current_time);
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err);
    process.exit(1);
  }
})();
