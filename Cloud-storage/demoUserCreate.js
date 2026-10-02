const pool = require('./db');

const userId = Number(process.argv[2]);
const email = process.argv[3];
const storageLimitGB = Number(process.argv[4]) || 180;

async function run() {
    if (!userId || !email) throw new Error('Usage: node demoUserCreate.js <userId> <email> [storageLimitGB]');

    const bytes = storageLimitGB * 1024 * 1024 * 1024;
    await pool.query(
        'INSERT INTO users (user_id, email, storage_limit) VALUES (?, ?, ?)',
        [userId, email, bytes]
    );
    console.log(`Created user ${userId} (${email}) with ${storageLimitGB}GB quota.`);
}

run().catch(err => console.error('Create failed:', err.message)).finally(() => pool.end());