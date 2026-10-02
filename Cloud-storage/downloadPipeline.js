const fs = require('fs');
const { pipeline } = require('stream/promises');
const { getFile, getFileLocal } = require('./storageService');
const { getFileById } = require('./dbService');

async function handleDownload({ fileId, requestingUserId, destinationPath }) {
    const file = await getFileById(fileId);

    if (!file || file.status === 'deleted') {
        throw new Error('File not found');
    }

    if (file.visibility === 'private' && file.owner_id !== requestingUserId) {
        throw new Error('Not authorized to access this private file');
    }

    const bodyStream = file.storage_area === 'LOCAL'
        ? await getFileLocal(file.storage_key)
        : await getFile(file.storage_key);

    await pipeline(bodyStream, fs.createWriteStream(destinationPath));

    return { fileId, storageKey: file.storage_key, savedTo: destinationPath };
}

module.exports = { handleDownload };