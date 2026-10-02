const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const b2Client = require('./b2Client');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const BUCKET = process.env.B2_BUCKET_NAME;
const LOCAL_ROOT = process.env.LOCAL_STORAGE_ROOT;

async function uploadFile(storageKey, fileBuffer, contentType) {
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, Body: fileBuffer, ContentType: contentType });
    await b2Client.send(command);
    return storageKey;
}

async function deleteFile(storageKey) {
    const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey });
    await b2Client.send(command);
}

async function getFile(storageKey) {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
    const response = await b2Client.send(command);
    return response.Body;
}

async function uploadFileLocal(storageKey, fileBuffer) {
    const fullPath = path.join(LOCAL_ROOT, storageKey);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, fileBuffer);
    return storageKey;
}

async function deleteFileLocal(storageKey) {
    const fullPath = path.join(LOCAL_ROOT, storageKey);
    await fsp.unlink(fullPath).catch(err => {
        if (err.code !== 'ENOENT') throw err;
    });
}

async function getFileLocal(storageKey) {
    const fullPath = path.join(LOCAL_ROOT, storageKey);
    return fs.createReadStream(fullPath);
}

module.exports = { uploadFile, deleteFile, getFile, uploadFileLocal, deleteFileLocal, getFileLocal };