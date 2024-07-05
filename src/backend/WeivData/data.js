import { files } from 'wix-media.v2';
import * as wixAuth from 'wix-auth'

export async function gheblo_shortvideos_beforeInsert(item, context) {
    try {
        const videoUrl = item.videoUrl;
        const videoId = getVideoId(videoUrl);

        if (videoId) {
            const elevatedGetFile = wixAuth.elevate(files.getFileDescriptor)
            const videoDetails = await elevatedGetFile(videoId);

            return {
                ...item,
                thumbnailUrl: videoDetails.thumbnailUrl
            }
        } else {
            return item;
        }
    } catch (err) {
        throw new Error(`Error when creating item on ShortVideos collection, ${err}`);
    }
}

function getVideoId(wixVideoUrl) {
    const regex = /wix:video:\/\/v1\/([^/]+)\//;
    const match = wixVideoUrl.match(regex);
    return match ? match[1] : null;
}