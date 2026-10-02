const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline/promises');
const pool = require('./db');

const DEMO_USER_IDS = [101, 102, 103, 104, 105];
const LOCAL_ROOT = process.env.LOCAL_STORAGE_ROOT;

async function confirm() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('This will PERMANENTLY delete all 5 demo users and their files. Type "yes delete demo" to continue: ');
    rl.close();
    return answer.trim() === 'yes delete demo';
}

async function teardown() {
    const confirmed = await confirm();
    if (!confirmed) {
        console.log('Teardown cancelled — no changes made.');
        return;
    }

    for (const userId of DEMO_USER_IDS) {
        await pool.query('DELETE FROM files WHERE owner_id = ?', [userId]);
        await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
        const folder = path.join(LOCAL_ROOT, 'private', `user_${userId}`);
        await fsp.rm(folder, { recursive: true, force: true });
        console.log(`Removed demo user ${userId} and their local files.`);
    }
    console.log('Demo teardown complete.');
}

teardown().catch(err => console.error('Teardown failed:', err.message)).finally(() => pool.end());