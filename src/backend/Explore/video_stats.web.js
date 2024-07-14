import { Permissions, webMethod } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import weivData, { convertId } from '@exweiv/weiv-data';
import moment from 'moment'; //@ts-ignore
import { updateVideoStats } from './hooks';

export const likeVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;
        const convretedVideoId = convertId(videoId);
        const updatedStats = await (await weivData.native("Gheblo/MemberVideoStats", true)).findOneAndUpdate({ videoId: convretedVideoId, memberId }, {
            $set: {
                videoId: convretedVideoId,
                memberId,
                liked: true,
                _updatedDate: new Date()
            }
        }, { upsert: true, returnDocument: "after" });

        await weivData.increment("Gheblo/Videos", convretedVideoId, "likes", 1, { suppressAuth: true, suppressHooks: true });
        return updatedStats;
    } catch (err) {
        throw new Error(`Error liking video: ${err}`);
    }
});

export const removeLike = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        const memberId = currentUser.id;
        const convretedVideoId = convertId(videoId);
        const updatedStats = await (await weivData.native("Gheblo/MemberVideoStats", true)).findOneAndUpdate({ videoId: convretedVideoId, memberId }, {
            $set: {
                videoId: convretedVideoId,
                memberId,
                liked: false,
                _updatedDate: new Date()
            }
        }, { upsert: true, returnDocument: "after" });

        await weivData.increment("Gheblo/Videos", convretedVideoId, "likes", -1, { suppressAuth: true, suppressHooks: true });
        return updatedStats;
    } catch (err) {
        throw new Error(`Error removing like: ${err}`);
    }
});

export const saveProductATCStats = webMethod(Permissions.SiteMember, async (videoId, productId) => {
    try {
        const memberId = currentUser.id;
        await (await weivData.native("Gheblo/MemberVideoStats", true)).updateOne({ videoId: convertId(videoId), memberId }, { $set: { productAddedToCart: productId, _updatedDate: new Date() } }, { upsert: true });
        return true;
    } catch (err) {
        throw new Error(`Error saving product ATC stats: ${err}`); ``
    }
});

export const saveVideoStats = webMethod(Permissions.SiteMember, async (videoId, watchtime) => {
    try {
        const memberId = currentUser.id;

        let views = 1;
        let actualWatchtime = watchtime;
        const currentStats = await (await weivData.native("Gheblo/MemberVideoStats", true)).findOne({ videoId: convertId(videoId), memberId });

        const oneHourAgo = moment().subtract(1, 'hour');
        if (moment(currentStats?._updatedDate).isBefore(oneHourAgo)) {
            views = currentStats.views + 1;
        }

        if (currentStats?.watchtime > watchtime) {
            actualWatchtime = currentStats.watchtime;
        }

        await (await weivData.native("Gheblo/MemberVideoStats", true)).updateOne({ videoId: convertId(videoId), memberId }, { $set: { watchtime: actualWatchtime, views, _updatedDate: new Date() } }, { upsert: true });

        // Update stats
        updateVideoStats(videoId);
        return true;
    } catch (err) {
        throw new Error(`Error saving watchtime and views stats: ${err}`);
    }
});