const { getFileById, softDeleteFile } = require('./dbService');

async function handleDelete({ fileId, requestingUserId }) {
    const file = await getFileById(fileId);

    if (!file) {
        throw new Error('File not found');
    }

    if (file.owner_id !== requestingUserId) {
        throw new Error('Not authorized to delete this file');
    }

    await softDeleteFile(fileId);

    return {
        fileId,
        status: 'deleted',
        note: 'File marked for deletion; will be permanently removed after the grace period',
    };
}

module.exports = { handleDelete };