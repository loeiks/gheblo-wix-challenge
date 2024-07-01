import { Permissions, webMethod } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import weivData from '@exweiv/weiv-data';

export const updateStats = webMethod(Permissions.Anyone, async (videoId, stats) => {
    try {
        const memberId = currentUser.id;

        const { items } = await weivData.query("Gheblo/ShortVideos").eq("videoId", videoId).eq("memberId", memberId).find({ omitTotalCount: false, suppressAuth: true });
        const statsData = items[0];

        return await weivData.update("Gheblo/ShortVideos", { ...statsData, ...stats }, { suppressAuth: true });
    } catch (err) {
        console.error(err);
    }
});
