const { deleteFile, deleteFileLocal } = require('./storageService');
const { getFilesPendingCleanup, hardDeleteFileRow } = require('./dbService');
const pool = require('./db');

const GRACE_PERIOD_DAYS = 7;

async function runCleanup() {
    const pendingFiles = await getFilesPendingCleanup(GRACE_PERIOD_DAYS);
    console.log(`Found ${pendingFiles.length} file(s) ready for permanent deletion.`);

    for (const file of pendingFiles) {
        try {
            if (file.storage_area === 'LOCAL') {
                await deleteFileLocal(file.storage_key);
            } else {
                await deleteFile(file.storage_key);
            }
            await hardDeleteFileRow(file.file_id);
            console.log(`Permanently deleted file_id ${file.file_id} (${file.storage_key})`);
        } catch (err) {
            console.error(`Failed to clean up file_id ${file.file_id}:`, err.message);
        }
    }
    console.log('Cleanup run complete.');
}

runCleanup().catch(err => console.error('Cleanup job failed:', err.message)).finally(() => pool.end());