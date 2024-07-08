import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import { getProductBySlug } from 'backend/Helpers/product_helpers.web';
import { recursivelyConvertIds } from 'backend/Helpers/recursive_id_converter';

export const getProductQuestions = webMethod(Permissions.Anyone, async (productSlug, skip = 0, limit = 0, searchPhrase = undefined) => {
    try {
        if (!productSlug) {
            throw new Error("Product slug is required");
        }

        const currentMemberId = currentUser.loggedIn ? currentUser.id : undefined;
        const product = await getProductBySlug(productSlug);

        const filter = weivData.filter().eq("productId", product._id)
        const questionsQuery = weivData.aggregate("Gheblo/Questions");

        if (searchPhrase) {
            questionsQuery.stage(
                {
                    $search: {
                        index: "QuestionSearches",
                        text: {
                            query: searchPhrase,
                            path: ["text"],
                            fuzzy: {}
                        }
                    }
                },
                {
                    $addFields: {
                        "score": { $meta: 'searchScore' }
                    }
                },
                {
                    $sort: {
                        "score": 1
                    }
                }
            )
        }

        questionsQuery.skip(skip || 0).descending("_createdDate").filter(filter).limit(limit || 10);

        if (currentMemberId) {
            questionsQuery.stage(
                {
                    $addFields: {
                        _isOwner: {
                            $cond: {
                                if: { $eq: [currentMemberId, "$_owner"] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                },
                {
                    $sort: {
                        _isOwner: -1,
                    }
                }
            )
        }

        questionsQuery.stage(
            {
                $lookup: {
                    from: "WixMembersProfileData",
                    localField: "_owner",
                    foreignField: "entity._id",
                    as: "member_data",
                }
            },
            {
                $addFields: {
                    "member": { $arrayElemAt: ["$member_data", 0] }
                }
            },
            {
                $project: {
                    "member_data": 0
                }
            },
            {
                $lookup: {
                    from: "QuestionReplies",
                    localField: "replies",
                    foreignField: "_id",
                    as: "replies",
                    pipeline: [
                        {
                            $sort: {
                                "_createdDate": -1
                            }
                        },
                        {
                            $limit: 1
                        },
                        {
                            $lookup: {
                                from: "WixMembersProfileData",
                                localField: "_owner",
                                foreignField: "entity._id",
                                as: "member_data"
                            }
                        },
                        {
                            $addFields: {
                                "member": { $arrayElemAt: ["$member_data", 0] }
                            }
                        },
                        {
                            $project: {
                                "member_data": 0
                            }
                        }
                    ]
                },
            }
        );

        const { items, hasNext } = await questionsQuery.run({ suppressAuth: true, convertIds: false });

        return {
            questions: recursivelyConvertIds(items),
            product,
            hasNext: hasNext()
        };
    } catch (err) {
        throw new Error(`Failed to fetch product questions, ${err}`);
    }
});

export const getQuestionAndReplies = webMethod(Permissions.Anyone, async (productSlug, questionId) => {
    try {
        if (!questionId || !productSlug) {
            throw new Error("Question ID and product slug are required");
        }

        const currentMemberId = currentUser.loggedIn ? currentUser.id : undefined;
        const product = await getProductBySlug(productSlug);

        const filter = weivData.filter().eq("_id", questionId).eq("productId", product._id);
        const questionAndReplies = await weivData.aggregate("Gheblo/Questions").filter(filter).stage(
            {
                $lookup: {
                    from: "WixMembersProfileData",
                    localField: "_owner",
                    foreignField: "entity._id",
                    as: "member_data"
                }
            },
            {
                $addFields: {
                    "member": { $arrayElemAt: ["$member_data", 0] }
                }
            },
            {
                $project: {
                    "member_data": 0
                }
            },
            {
                $lookup: {
                    from: "QuestionReplies",
                    localField: "replies",
                    foreignField: "_id",
                    as: "replies",
                    pipeline: getPipeline(currentMemberId)
                }
            }
        ).run({ suppressAuth: true })

        return {
            question: recursivelyConvertIds(questionAndReplies.items),
            product
        };
    } catch (err) {
        throw new Error(`Failed to fetch question and replies, ${err}`);
    }
});

export function getPipeline(currentMemberId) {
    let pipeline = [];
    pipeline.push(
        {
            $sort: {
                "_createdDate": -1
            }
        }
    );

    if (currentMemberId) {
        pipeline.push(
            {
                $addFields: {
                    _isOwner: {
                        $cond: {
                            if: { $eq: [currentMemberId, "$_owner"] },
                            then: 1,
                            else: 0
                        }
                    }
                }
            },
            {
                $sort: {
                    _isOwner: -1,
                }
            }
        )
    }

    pipeline.push(
        {
            $lookup: {
                from: "WixMembersProfileData",
                localField: "_owner",
                foreignField: "entity._id",
                as: "member_data"
            }
        },
        {
            $addFields: {
                "member": { $arrayElemAt: ["$member_data", 0] }
            }
        },
        {
            $project: {
                "member_data": 0
            }
        },
    );

    return pipeline;
}