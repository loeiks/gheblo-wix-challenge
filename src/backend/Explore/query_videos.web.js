import { Permissions, webMethod } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import weivData, { convertId } from '@exweiv/weiv-data';
import { recursivelyConvertIds } from 'backend/Helpers/recursive_id_converter';

export const queryVideos = webMethod(Permissions.Anyone, async (skipCount, notIncludedVideoId) => {
    try {
        if (currentUser.loggedIn) {
            const memberId = currentUser.id;

            const statsFilter = weivData.query("Gheblo/ShortVideoStats").eq("memberId", memberId)
            if (notIncludedVideoId) {
                statsFilter.ne("videoId", notIncludedVideoId)
            }

            let memberVideoStats = await weivData.query("Gheblo/ShortVideoStats")
                .and(statsFilter)
                .find({ suppressAuth: true, suppressHooks: true });

            let watchedVideoIds = [];
            if (memberVideoStats.items.length > 0) {
                watchedVideoIds = memberVideoStats.items.map((stats) => {
                    return stats.videoId;
                });
            }

            const aggregationPipeline = weivData.aggregate("Gheblo/ShortVideos").descending("_createdDate");

            if (watchedVideoIds.length > 0) {
                aggregationPipeline.stage(
                    {
                        $addFields: {
                            isInArray: { $in: ["$_id", watchedVideoIds] }
                        }
                    },
                    {
                        $sort: { isInArray: 1 }
                    },
                    {
                        $project: { isInArray: 0 }
                    }
                )
            }

            const aggregateResult = await aggregationPipeline.skip(skipCount || 0)
                .limit(15)
                .stage(
                    {
                        $lookup: {
                            from: "WixStoresProducts",
                            localField: "productIds",
                            foreignField: "entity._id",
                            as: "products"
                        }
                    },
                    {
                        $lookup: {
                            from: "WixMembersProfileData",
                            localField: "_owner",
                            foreignField: "entity._id",
                            as: "memberProfileData"
                        }
                    },
                    {
                        $addFields: {
                            _currentMemberId: memberId
                        }
                    },
                    {
                        $lookup: {
                            from: "ShortVideoStats",
                            let: {
                                memberId: "$_currentMemberId",
                                videoId: "$_id"
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$memberId", "$$memberId"] },
                                                { $eq: ["$videoId", "$$videoId"] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "memberVideoStats"
                        }
                    }
                )
                .run({ suppressAuth: true });

            return {
                items: recursivelyConvertIds(aggregateResult.items),
                skipCount: aggregateResult.length
            };
        } else {
            const randomVideos = await weivData.query("Gheblo/ShortVideos")
                .skip(skipCount || 0)
                .include(
                    {
                        collectionName: "WixStoresProducts",
                        fieldName: "productIds",
                        foreignField: "entity._id",
                        as: "products",
                    },
                    {
                        collectionName: "WixMembersProfileData",
                        fieldName: "_owner",
                        foreignField: "entity._id",
                        as: "memberProfileData"
                    }
                )
                .find({ suppressAuth: true, suppressHooks: true });

            return {
                items: recursivelyConvertIds(randomVideos.items),
                skipCount: randomVideos.length
            };
        }
    } catch (err) {
        throw new Error(`Error when querying explore videos randomly, ${err}`);
    }
});

export const getVideo = webMethod(Permissions.Anyone, async (videoId) => {
    try {
        const memberId = currentUser.loggedIn ? currentUser.id : null;
        const videosAggregation = weivData.aggregate("Gheblo/ShortVideos")
            .filter(weivData.filter().eq("_id", convertId(videoId)))
            .stage(
                {
                    $lookup: {
                        from: "WixStoresProducts",
                        localField: "productIds",
                        foreignField: "entity._id",
                        as: "products"
                    }
                },
                {
                    $lookup: {
                        from: "WixMembersProfileData",
                        localField: "_owner",
                        foreignField: "entity._id",
                        as: "memberProfileData"
                    }
                },
            )


        if (currentUser.loggedIn) {
            videosAggregation.stage(
                {
                    $addFields: {
                        _currentMemberId: memberId
                    }
                },
                {
                    $lookup: {
                        from: "ShortVideoStats",
                        let: {
                            memberId: "$_currentMemberId",
                            videoId: "$_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$memberId", "$$memberId"] },
                                            { $eq: ["$videoId", "$$videoId"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "memberVideoStats"
                    }
                }
            )
            const videos = await videosAggregation.run({ suppressAuth: true });
            return recursivelyConvertIds(videos.items)[0];
        } else {
            const videos = await videosAggregation.run({ suppressAuth: true });
            return recursivelyConvertIds(videos.items)[0];
        }
    } catch (err) {
        throw new Error(`Error when getting explore video by id, ${err}`);
    }
});