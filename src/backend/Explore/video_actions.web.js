import { Permissions, webMethod } from 'wix-web-module';
import weivData, { convertId } from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';

export const createVideo = webMethod(Permissions.SiteMember, async (videoData) => {
    try {
        const insertedItem = await weivData.insert("Gheblo/ShortVideos", {
            ...videoData,
            views: 0,
            likes: 0,
        }, { suppressAuth: true, suppressHooks: true });
        return insertedItem;
    } catch (err) {
        console.error(err);
    }
});

export const deleteVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        await weivData.remove("Gheblo/ShortVideos", videoId, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
        return { deleted: true }
    } catch (err) {
        console.error(err);
        return {
            deleted: false,
            msg: "Video not found in your profile!"
        }
    }
});

export const updateVideoDetails = webMethod(Permissions.SiteMember, async (videoId, newTitle, newProductIds) => {
    try {
        await weivData.update("Gheblo/ShortVideos", {
            _id: videoId,
            title: newTitle,
            productIds: newProductIds
        }, { suppressAuth: true, suppressHooks: true, onlyOwner: true });

        return { updated: true }
    } catch (err) {
        console.error(err);
        return {
            updated: false,
            msg: "Video not found in your profile!"
        }
    }
});

export const likeVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;
        const convretedVideoId = convertId(videoId);

        const updatedStats = await (await weivData.native("Gheblo/ShortVideoStats", true)).findOneAndUpdate({ videoId: convretedVideoId, memberId }, {
            $set: {
                videoId: convretedVideoId,
                memberId,
                liked: true
            }
        }, { upsert: true, returnDocument: "after" });

        //@ts-ignore
        await (await weivData.native("Gheblo/ShortVideos", true)).findOneAndUpdate({ _id: convretedVideoId }, { $inc: { likes: +1 } });
        return updatedStats;
    } catch (err) {
        console.error(err);
    }
});

export const removeLike = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;
        const convretedVideoId = convertId(videoId);

        const updatedStats = await (await weivData.native("Gheblo/ShortVideoStats", true)).findOneAndUpdate({ videoId: convretedVideoId, memberId }, {
            $set: {
                videoId: convretedVideoId,
                memberId,
                liked: false
            }
        }, { upsert: true, returnDocument: "after" });

        //@ts-ignore
        await (await weivData.native("Gheblo/ShortVideos", true)).findOneAndUpdate({ _id: convretedVideoId }, { $inc: { likes: -1 } });
        return updatedStats;
    } catch (err) {
        console.error(err);
    }
})