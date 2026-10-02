const { uploadFile, deleteFile, uploadFileLocal, deleteFileLocal } = require('./storageService');
const { checkQuota, finalizeUpload } = require('./dbService');

function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100);
}

async function handleUpload({ userId, projectId, fileName, fileType, fileBuffer, visibility, provider }) {
    const activeProvider = provider || process.env.STORAGE_PROVIDER_NAME;
    const fileSize = fileBuffer.length;

    const quota = await checkQuota(userId, fileSize);
    if (!quota.allowed) {
        throw new Error(`Upload would exceed storage quota (${quota.wouldBe} / ${quota.storage_limit} bytes)`);
    }

    const folder = fileType.startsWith('video') ? 'videos' : 'images';
    const area = visibility === 'public' ? 'public' : 'private';
    const safeFileName = sanitizeFileName(fileName);
    const storageKey = `${area}/user_${userId}/${folder}/${Date.now()}_${safeFileName}`;

    if (activeProvider === 'LOCAL') {
        await uploadFileLocal(storageKey, fileBuffer);
    } else {
        await uploadFile(storageKey, fileBuffer, fileType);
    }

    try {
        const fileId = await finalizeUpload({
            owner_id: userId,
            project_id: projectId,
            file_name: fileName,
            file_type: fileType,
            file_size: fileSize,
            storage_key: storageKey,
            storage_area: activeProvider,
            visibility,
        });

        return { fileId, storageKey };
    } catch (dbError) {
        const rollback = activeProvider === 'LOCAL' ? deleteFileLocal(storageKey) : deleteFile(storageKey);
        await rollback.catch(() => {
            console.error(`WARNING: orphaned ${activeProvider} object left behind at ${storageKey} — manual cleanup needed`);
        });
        throw dbError;
    }
}

module.exports = { handleUpload };