const fs = require('fs');
const { handleUpload } = require('./uploadPipeline');
const pool = require('./db');

async function runTest() {
    const fileBuffer = fs.readFileSync('test-image.png');

    const result = await handleUpload({
        userId: 1,
        projectId: 1,
        fileName: 'test-image.png',
        fileType: 'image/png',
        fileBuffer,
        visibility: 'private',
    });

    console.log('Upload succeeded:', result);
}

runTest()
    .catch(err => console.error('Upload failed:', err.message))
    .finally(() => pool.end());