const fs = require('fs');
const { handleUpload } = require('./uploadPipeline');
const pool = require('./db');

async function runTest() {
    const fileBuffer = fs.readFileSync('test-image.png');
    const result = await handleUpload({
        userId: 101,
        projectId: null,
        fileName: 'test-image.png',
        fileType: 'image/png',
        fileBuffer,
        visibility: 'private',
        provider: 'LOCAL',
    });
    console.log('Local upload succeeded:', result);
}

runTest().catch(err => console.error('Local upload failed:', err.message)).finally(() => pool.end());