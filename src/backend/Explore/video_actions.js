import { Permissions, webMethod } from 'wix-web-module';
import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';

export const createVideo = webMethod(Permissions.SiteMember, async (videoData) => {
    try {
        const memberId = currentUser.id;
        const insertedItem = await weivData.insert("Gheblo/ShortVideos", {
            ...videoData,
            views: 0,
            likes: 0,
            author: memberId
        }, { suppressAuth: true });

        return insertedItem;
    } catch (err) {
        console.error(err);
    }
});

export const deleteVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;
        const foundVideo = await (await weivData.native("Gheblo/ShortVideos")).findOne({ author: memberId, _id: videoId });

        if (foundVideo) {
            await weivData.remove("Gheblo/ShortVideos", videoId, { suppressAuth: true });
            return {
                deleted: true
            }
        } else {
            return {
                deleted: false,
                msg: "Video not found in your profile!"
            }
        }
    } catch (err) {
        console.error(err);
    }
});

export const updateVideoDetails = webMethod(Permissions.SiteMember, async (videoId, newTitle, newProductIds) => {
    try {
        const memberId = currentUser.id;
        const foundVideo = await (await weivData.native("Gheblo/ShortVideos")).findOne({ author: memberId, _id: videoId });

        if (foundVideo) {
            await weivData.update("Gheblo/ShortVideos", {
                ...foundVideo,
                title: newTitle,
                productIds: newProductIds
            }, { suppressAuth: true });

            return {
                updated: true
            }
        } else {
            return {
                updated: false,
                msg: "Video not found in your profile!"
            }
        }
    } catch (err) {
        console.error(err);
    }
});

export const likeVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;

        await (await weivData.native("Gheblo/ShortVideoStats")).findOneAndUpdate({ videoId, memberId }, {
            videoId,
            memberId,
            liked: true
        }, { returnDocument: "after", upsert: true });

        const updatedVideo = await (await weivData.native("Gheblo/ShortVideos")).findOneAndUpdate({ _id: videoId }, { $inc: { likes: 1 } }, { returnDocument: "after" });
        return updatedVideo;
    } catch (err) {
        console.error(err);
    }
});