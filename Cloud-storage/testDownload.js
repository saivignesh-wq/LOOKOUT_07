const { handleDownload } = require('./downloadPipeline');
const pool = require('./db');

const fileId = Number(process.argv[2]);
const requestingUserId = Number(process.argv[3]) || 1;
const destinationPath = process.argv[4] || './downloaded-test-image.png';

async function runTest() {
    if (!fileId) {
        throw new Error('Usage: node testDownload.js <fileId> [requestingUserId] [destinationPath]');
    }

    const result = await handleDownload({ fileId, requestingUserId, destinationPath });
    console.log('Download succeeded:', result);
}

runTest()
    .catch(err => console.error('Download failed:', err.message))
    .finally(() => pool.end());