import { webMethod, Permissions } from "wix-web-module";
import { getMemberProfileData } from "backend/Members/member_data.web.js";
import weivData, { convertId } from '@exweiv/weiv-data';
import { getProductIdBySlug } from "backend/Helpers/product_helpers.web.js";

/**
 * @typedef {string} MediaItem
 */

export const createReview = webMethod(Permissions.SiteMember, async (reviewData) => {
    try {
        const defaultContent = {
            body: "",
            media: [],
            rating: 5
        }

        const reviewObj = {
            ...reviewData,
            content: {
                ...defaultContent,
                ...reviewData.content
            }
        }

        return await weivData.insert("Gheblo/ProductReviews", reviewObj, { suppressAuth: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error while creating review, ${err}`);
    }
});

export const deleteReview = webMethod(Permissions.SiteMember, async (reviewId) => {
    try {
        return await weivData.remove("Gheblo/ProductReviews", reviewId, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
    } catch (err) {
        throw new Error(`Error while deleting review, ${err}`);
    }
});

export const updateReview = webMethod(Permissions.SiteMember, async (reviewId, reviewData) => {
    try {
        return await weivData.update("Gheblo/ProductReviews", reviewData, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
    } catch (err) {
        throw new Error(`Error while updating review, ${err}`);
    }
});

export const queryReviews = webMethod(Permissions.Anyone, async (productSlug, limit = 10, skip = 0, includeRatingDetails) => {
    try {
        const productId = await getProductIdBySlug(productSlug);
        const result = await (await weivData.native("Gheblo/ProductReviews", true)).find({
            "productId": {
                $eq: productId
            },
            "content.body": {
                $exists: true,
                $ne: null
            },

        }, { sort: { "_id": -1 }, limit: limit || 10, skip: skip || 0 }).toArray();

        const items = await result.map(async (item) => {
            const memberData = await getMemberProfileData(item._owner);
            return {
                ...item,
                _id: convertId(item._id),
                memberData
            }
        });

        if (includeRatingDetails) {
            return {
                items: await Promise.all(items),
                ratings: await getProductReviewRatingDetails(productSlug)
            }
        } else {
            return await Promise.all(items);
        }
    } catch (err) {
        throw new Error(`Error while querying reviews, ${err}`);
    }
});

export const getProductReviewRatingDetails = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        const productId = await getProductIdBySlug(productSlug);
        const ratings = await weivData.aggregate("Gheblo/ProductReviews").stage(
            {
                $match: { productId }
            },
            {
                $group: {
                    _id: "$productId",
                    totalReviews: {
                        $sum: {
                            $cond: [{ $ne: ["$content.body", null] }, 1, 0]
                        }
                    },
                    totalRatings: {
                        $sum: {
                            $cond: [{ $ne: ["$content.rating", null] }, 1, 0]
                        }
                    },
                    avgRating: { $avg: "$content.rating" }
                }
            },
            {
                $sort: { _id: -1 }
            }
        ).run({ suppressAuth: true });

        return ratings.items[0];
    } catch (err) {
        throw new Error(`Error while getting product rating reviews, ${err}`);
    }
})