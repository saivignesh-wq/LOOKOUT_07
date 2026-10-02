const pool = require('./db');

async function checkQuota(userId, incomingFileSize) {
    const [rows] = await pool.query(
        'SELECT storage_limit, storage_used FROM users WHERE user_id = ?',
        [userId]
    );
    if (rows.length === 0) throw new Error('User not found');

    const { storage_limit, storage_used } = rows[0];
    const wouldBe = Number(storage_used) + Number(incomingFileSize);

    return { allowed: wouldBe <= storage_limit, wouldBe, storage_limit };
}

async function finalizeUpload(fileData) {
    const { owner_id, project_id, file_name, file_type, file_size, storage_key, storage_area, visibility } = fileData;

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT storage_limit, storage_used FROM users WHERE user_id = ? FOR UPDATE',
            [owner_id]
        );
        if (rows.length === 0) throw new Error('User not found');

        const { storage_limit, storage_used } = rows[0];
        const wouldBe = Number(storage_used) + Number(file_size);
        if (wouldBe > storage_limit) {
            throw new Error(`Upload would exceed storage quota (${wouldBe} / ${storage_limit} bytes)`);
        }

        const [result] = await conn.query(
            `INSERT INTO files (owner_id, project_id, file_name, file_type, file_size, storage_key, storage_area, visibility)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [owner_id, project_id || null, file_name, file_type, file_size, storage_key, storage_area, visibility || 'private']
        );

        await conn.query(
            'UPDATE users SET storage_used = storage_used + ? WHERE user_id = ?',
            [file_size, owner_id]
        );

        await conn.commit();
        return result.insertId;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function getFileById(fileId) {
    const [rows] = await pool.query('SELECT * FROM files WHERE file_id = ?', [fileId]);
    return rows[0] || null;
}

async function softDeleteFile(fileId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT owner_id, file_size, status FROM files WHERE file_id = ? FOR UPDATE',
            [fileId]
        );
        if (rows.length === 0) throw new Error('File record not found');
        if (rows[0].status === 'deleted') throw new Error('File is already deleted');

        const { owner_id, file_size } = rows[0];

        await conn.query(
            "UPDATE files SET status = 'deleted', deleted_at = NOW() WHERE file_id = ?",
            [fileId]
        );

        await conn.query(
            'UPDATE users SET storage_used = storage_used - ? WHERE user_id = ?',
            [file_size, owner_id]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function getFilesPendingCleanup(gracePeriodDays) {
    const [rows] = await pool.query(
        `SELECT file_id, storage_key, storage_area FROM files
         WHERE status = 'deleted'
         AND deleted_at <= NOW() - INTERVAL ? DAY`,
        [gracePeriodDays]
    );
    return rows;
}

async function hardDeleteFileRow(fileId) {
    await pool.query('DELETE FROM files WHERE file_id = ?', [fileId]);
}

module.exports = { checkQuota, finalizeUpload, getFileById, softDeleteFile, getFilesPendingCleanup, hardDeleteFileRow };