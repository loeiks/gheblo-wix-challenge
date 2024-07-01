import { Permissions, webMethod } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import weivData from '@exweiv/weiv-data';

export const queryVideos = webMethod(Permissions.Anyone, async (skipCount) => {
    try {
        const loggedIn = currentUser.loggedIn;

        if (loggedIn) {
            const memberId = currentUser.id;

            let watchedVideoIds = await weivData.aggregate("Gheblo/ShortVideoStats")
                .filter(weivData.filter().eq("memberId", memberId))
                .group("videoId")
                .run({ suppressAuth: true });
            watchedVideoIds = watchedVideoIds.items[0].videoId;

            const aggregateResult = await weivData.aggregate("Gheblo/ShortVideos")
                .stage({
                    $addFields: {
                        isInArray: { $in: ["$_id", watchedVideoIds] }
                    }
                }, {
                    $sort: { isInArray: 1 }
                }, {
                    $project: { isInArray: 0 }
                })
                .skip(skipCount)
                .limit(15)
                .stage({
                    $lookup: {
                        from: "WixStoresProducts",
                        localField: "productIds",
                        foreignField: "product._id",
                        as: "productsData"
                    }
                })
                .run({ suppressAuth: true });

            return {
                items: aggregateResult.items,
                skipCount
            };
        } else {
            const randomVideos = await weivData.query("Gheblo/ShortVideos")
                .skip(skipCount)
                .include({
                    collectionName: "WixStoresProducts",
                    fieldName: "productIds",
                    as: "products",
                    foreignField: "product._id"
                })
                .find({ suppressAuth: true });

            return {
                items: randomVideos.items,
                skipCount
            };
        }
    } catch (err) {
        console.error(err);
    }
});