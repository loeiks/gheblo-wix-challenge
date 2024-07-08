import { webMethod, Permissions } from "wix-web-module";
import { getMemberProfileData } from "backend/Members/member_data.web.js";
import weivData, { convertId } from '@exweiv/weiv-data';
import { getProductBySlug } from "backend/Helpers/product_helpers.web.js";

export const createReview = webMethod(Permissions.SiteMember,
    /**
     * @param {{
     * content: {
     * body: string,
     * media: string[],
     * rating: number
     * },
     * productId: string
     * }} reviewData 
     */
    async (reviewData) => {
        try {
            if (!reviewData) {
                throw new Error(`Review data is not valid`);
            } else {
                if (!reviewData.content || !reviewData.productId) {
                    throw new Error(`Review data is not valid, no content or productId`);
                } else {
                    if (!reviewData.content.body || !reviewData.content.rating) {
                        throw new Error(`Review data is not valid, no content body or rating`);
                    }
                }
            }

            if (!reviewData.content.media) {
                reviewData.content.media = [];
            }

            const productData = await (await weivData.native("Gheblo/WixStoresProducts", true)).findOne({ "entity._id": reviewData.productId });
            if (!productData) {
                throw new Error(`Product data is not valid`);
            }

            const createdReview = await weivData.insert("Gheblo/ProductReviews", reviewData, { suppressAuth: true, suppressHooks: true });

            return {
                ...createdReview,
                product: [productData]
            }
        } catch (err) {
            throw new Error(`Error while creating review, ${err}`);
        }
    });

export const updateReview = webMethod(Permissions.SiteMember,
    /**
    * @param {string} reviewId 
    * @param {{
    * content: {
    * body: string,
    * media: string[],
    * rating: number
    * },
    * productId: string
    * }} reviewData 
    */
    async (reviewId, reviewData) => {
        try {
            if (!reviewData || !reviewId) {
                throw new Error(`Review data or review id is not valid`);
            } else {
                if (!reviewData.content || !reviewData.productId) {
                    throw new Error(`Review data is not valid, no content or productId`);
                } else {
                    if (!reviewData.content.body || !reviewData.content.rating) {
                        throw new Error(`Review data is not valid, no content body or rating`);
                    }
                }
            }

            if (!reviewData.content.media) {
                reviewData.content.media = [];
            }

            const productData = await (await weivData.native("Gheblo/WixStoresProducts", true)).findOne({ "entity._id": reviewData.productId });
            if (!productData) {
                throw new Error(`Product data is not valid`);
            }

            const updatedReviewData = await weivData.update("Gheblo/ProductReviews", reviewData, { suppressAuth: true, suppressHooks: true, onlyOwner: true });

            return {
                ...updatedReviewData,
                product: [productData]
            }
        } catch (err) {
            throw new Error(`Error while updating review, ${err}`);
        }
    });

export const deleteReview = webMethod(Permissions.SiteMember,
    /**
     * 
     * @param {string} reviewId 
     * @returns 
     */
    async (reviewId) => {
        try {
            if (!reviewId) {
                throw new Error(`Review id is not valid`);
            }

            await weivData.remove("Gheblo/ProductReviews", reviewId, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
            return true;
        } catch (err) {
            throw new Error(`Error while deleting review, ${err}`);
        }
    });

// Read Data
export const queryReviews = webMethod(Permissions.Anyone, async (productSlug, limit = 10, skip = 0, includeRatingDetails) => {
    try {
        const product = await getProductBySlug(productSlug);
        const result = await (await weivData.native("Gheblo/ProductReviews", true)).find({
            "productId": {
                $eq: product._id
            },
            "content.body": {
                $exists: true,
                $ne: null
            },
        }, { sort: { "_id": -1 }, limit: limit || 10, skip: skip || 0 }).toArray();

        const totalReviews = result.length > 0 ?
            await (await weivData.native("Gheblo/ProductReviews", true)).countDocuments({
                "productId": {
                    $eq: product._id
                },
                "content.body": {
                    $exists: true,
                    $ne: null
                }
            }) : 0;

        const items = result.map(async (item) => {
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
                ratings: await getProductReviewRatingDetails(productSlug),
                totalReviews
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
        const product = await getProductBySlug(productSlug);
        const ratings = await weivData.aggregate("Gheblo/ProductReviews").stage(
            {
                $match: { productId: product._id }
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