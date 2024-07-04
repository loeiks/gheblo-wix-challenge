import { Permissions, webMethod } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import weivData, { convertId } from '@exweiv/weiv-data';

export const saveStats = webMethod(Permissions.SiteMember, async (videoId, stats) => {
    try {
        const memberId = currentUser.id;
        const convertedVideoId = convertId(videoId);

        const memberStats = await (await weivData.native("Gheblo/ShortVideoStats", true)).findOne({ videoId: convertedVideoId, memberId });

        if (memberStats) {
            if (stats.watchTime > memberStats.watchTime || 0) {
                await (await weivData.native("Gheblo/ShortVideoStats", true)).updateOne({ videoId: convertedVideoId, memberId }, { $set: stats }, { upsert: true });
            }
        } else {
            await (await weivData.native("Gheblo/ShortVideoStats", true)).updateOne({ videoId: convertedVideoId, memberId }, { $set: stats }, { upsert: true });
        }

        return true;
    } catch (err) {
        console.error(err);
    }
});
