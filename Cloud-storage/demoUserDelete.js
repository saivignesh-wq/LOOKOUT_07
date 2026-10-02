const fsp = require('fs/promises');
const path = require('path');
const pool = require('./db');

const userId = Number(process.argv[2]);
const LOCAL_ROOT = process.env.LOCAL_STORAGE_ROOT;

async function run() {
    if (!userId) throw new Error('Usage: node demoUserDelete.js <userId>');

    await pool.query('DELETE FROM files WHERE owner_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);

    const folder = path.join(LOCAL_ROOT, 'private', `user_${userId}`);
    await fsp.rm(folder, { recursive: true, force: true });

    console.log(`Removed user ${userId} and their local files.`);
}

run().catch(err => console.error('Delete failed:', err.message)).finally(() => pool.end());