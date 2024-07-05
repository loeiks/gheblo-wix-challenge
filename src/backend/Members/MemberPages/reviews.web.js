import weivData, { convertId } from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';
import { webMethod, Permissions } from 'wix-web-module';

export const queryAllProductsCurrentMemberHasntReviewed = webMethod(Permissions.SiteMember, async () => {
    try {
        const currentMemberId = currentUser.id;
        const result = await weivData.aggregate("Gheblo/WixeComOrders").stage(
            {
                $match: { "entity.buyerInfo.memberId": currentMemberId },
            },
            {
                $unwind: "$entity.lineItems",
            },
            {
                $lookup: {
                    from: "ProductReviews",
                    let: { productId: "$entity.lineItems.catalogReference.catalogItemId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$productId", "$$productId"] },
                                        { $eq: ["$_owner", currentMemberId] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "existingReviews",
                },
            },
            {
                $match: {
                    "existingReviews.0": { $exists: false }
                },
            },
            {
                $group: {
                    _id: null,
                    productIds: { $addToSet: "$entity.lineItems.catalogReference.catalogItemId" },
                },
            },
            {
                $project: {
                    _id: 0,
                    productIds: 1,
                },
            },
            {
                $lookup: {
                    from: "WixStoresProducts",
                    localField: "productIds",
                    foreignField: "entity._id",
                    as: "products"
                }
            },
            {
                $project: {
                    products: 1
                }
            }
        ).run({ suppressAuth: true });


        if (result.items.length > 0) {
            return result.items[0].products.map((product) => {
                return {
                    ...product,
                    _id: convertId(product._id)
                }
            })
        } else {
            return [];
        }
    } catch (err) {
        throw new Error(`Error while querying all products member hasnt reviewed, ${err}`);
    }
});

export const queryAllReviewsOfCurrentMember = webMethod(Permissions.SiteMember, async () => {
    try {
        const currentMemberId = currentUser.id;
        const result = await weivData.query("Gheblo/ProductReviews").eq("_owner", currentMemberId).include({
            collectionName: "WixStoresProducts",
            foreignField: "entity._id",
            fieldName: "productId",
            as: "product"
        }).find({ suppressAuth: true, suppressHooks: true });
        return result;
    } catch (err) {
        throw new Error(`Error while querying all reviews of current member, ${err}`);
    }
});