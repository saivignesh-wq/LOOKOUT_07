const { handleDelete } = require('./deletePipeline');
const pool = require('./db');

const fileId = Number(process.argv[2]);
const requestingUserId = Number(process.argv[3]) || 1;

async function runTest() {
    if (!fileId) {
        throw new Error('Usage: node testDelete.js <fileId> [requestingUserId]');
    }

    const result = await handleDelete({ fileId, requestingUserId });
    console.log('Delete succeeded:', result);
}

runTest()
    .catch(err => console.error('Delete failed:', err.message))
    .finally(() => pool.end());