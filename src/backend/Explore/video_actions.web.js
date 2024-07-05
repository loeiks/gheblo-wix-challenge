import { Permissions, webMethod } from 'wix-web-module';
import weivData, { convertId } from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';


export const publishVideo = webMethod(Permissions.SiteMember,
    /**
    * @param {{
    * videoUrl: string,
    * productLinks: string,
    * title: string
    * }} videoData
    */
    async (videoData) => {
        try {
            if (!videoData.productLinks || !videoData.title || !videoData.videoUrl) {
                if (videoData.productLinks.length === 0 || videoData.title.length === 0) {
                    throw new Error("Invalid video data!");
                }
                throw new Error("Invalid video data!");
            }

            const productPageURLs = [...new Set(extractProductUrls(videoData.productLinks))];
            const products = await (await weivData.native("Gheblo/WixStoresProducts", true)).find({ "entity.productPageUrl": { $in: productPageURLs } }).toArray();
            const productIds = products.map(product => product.entity._id);

            const insertedItem = await weivData.insert("Gheblo/ShortVideos", {
                videoUrl: videoData.videoUrl,
                title: videoData.title,
                productIds,
                views: 0,
                likes: 0,
                productLinks: videoData.productLinks
            }, { suppressAuth: true });
            return insertedItem;
        } catch (err) {
            throw new Error(`Error creating video: ${err}`);
        }
    });

export const updateVideo = webMethod(Permissions.SiteMember,
    /**
   * @param {{
    * videoId: string,
    * productLinks: string,
    * title: string
    * }} videoData
    */
    async (videoData) => {
        try {
            if (!videoData.productLinks || !videoData.title || !videoData.videoId) {
                if (videoData.productLinks.length === 0 || videoData.title.length === 0) {
                    throw new Error("Invalid video data!");
                }
                throw new Error("Invalid video data!");
            }

            const productPageURLs = [...new Set(extractProductUrls(videoData.productLinks))];
            const products = await (await weivData.native("Gheblo/WixStoresProducts", true)).find({ "entity.productPageUrl": { $in: productPageURLs } }).toArray();
            const productIds = products.map(product => product.entity._id);

            return await weivData.update("Gheblo/ShortVideos", {
                _id: videoData.videoId,
                title: videoData.title,
                productIds,
                productLinks: videoData.productLinks
            }, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
        } catch (err) {
            throw new Error(`Error updating video: ${err}`);
        }
    });

export const deleteVideo = webMethod(Permissions.SiteMember, async (videoId) => {
    try {
        await weivData.remove("Gheblo/ShortVideos", videoId, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
        return true;
    } catch (err) {
        throw new Error(`Error deleting video: ${err}`);
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

// HELPERS
function extractProductUrls(urlsString) {
    const urlArray = urlsString.trim().split(/[, ]+/);
    const productUrls = urlArray.map(url => {
        const match = url.match(/\/product-page\/([^/]+)/);
        return match ? `/product-page/${match[1]}` : undefined;
    }).filter(item => item !== undefined);
    return productUrls;
}