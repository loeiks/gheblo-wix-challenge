import weivData, { convertId } from "@exweiv/weiv-data";

// Video Stats Algorithm
export async function updateVideoStats(updatedVideoId) {
    try {
        // const hasStatsToRender = await (await weivData.native("Gheblo/MemberVideoStats", true)).countDocuments({ "_updatedDate": { $lte: new Date().getTime() - 5 * 60 * 1000 } });

        // // Don't re-render if there are only two new updates.
        // if (hasStatsToRender <= 2) {
        //     return null;
        // }

        const result = await (await weivData.native("Gheblo/MemberVideoStats", true)).aggregate(
            [
                {
                    $match: {
                        // _updatedDate: {
                        //     $lte: new Date().getTime() - 5 * 60 * 1000 // Filter stats that are at least 10 minutes old
                        // },
                        videoId: {
                            $eq: convertId(updatedVideoId) // Only update stats for the specified videoId
                        }
                    }
                },
                {
                    $group: {
                        _id: "$videoId",
                        totalViews: { $sum: "$views" },
                        totalWatchtime: { $sum: "$watchtime" },
                        totalLikes: {
                            $sum: {
                                $cond: [{ $eq: ["$liked", true] }, 1, 0] // Count likes based on `liked` being true
                            }
                        },
                        totalUniqueViewers: { $addToSet: "$memberId" }, // Collect unique memberIds
                        totalAddToCarts: {
                            $sum: {
                                $cond: [{ $ne: ["$productAddedToCart", null] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: "$_id",
                        videoId: "$_id",
                        totalViews: 1,
                        totalWatchtime: 1,
                        totalLikes: 1,
                        totalUniqueViewers: { $size: "$totalUniqueViewers" }, // Count of unique viewers
                        totalAddToCarts: 1,
                        score: {
                            $round: [
                                {
                                    $divide: [
                                        {
                                            $sum: [
                                                { $multiply: ["$totalViews", 4] },
                                                { $multiply: ["$totalLikes", 6] },
                                                { $multiply: ["$totalWatchtime", 2] },
                                                { $multiply: [{ $size: "$totalUniqueViewers" }, 10] },
                                                { $multiply: ["$totalAddToCarts", 15] }
                                            ]
                                        }, 10
                                    ],
                                }, 1
                            ]
                        }
                    }
                },
                {
                    $merge: {
                        into: "Videos",
                        on: "_id",
                        whenMatched: [
                            {
                                $set: {
                                    views: "$$new.totalViews",
                                    likes: "$$new.totalLikes",
                                    score: "$$new.score"
                                }
                            }
                        ],
                        whenNotMatched: "discard"
                    }
                }
            ]).toArray();

        return result;
    } catch (err) {
        throw new Error(`Error when re-calculating algorithm point of a video after new stats added, ${err}`);
    }
}
