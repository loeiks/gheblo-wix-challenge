import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';

export const getProductIdBySlug = webMethod(Permissions.Anyone, async (slug) => {
    try {
        const product = await (await weivData.native("Gheblo/WixStoresProducts", true)).findOne({ "entity.slug": slug });
        return product.entity._id;
    } catch (err) {
        throw new Error(`Error when getting product id via slug, ${err}`);
    }
}, {
    cache: {
        tags: ["product-ids-by-slug"],
        ttl: 604800 // cache 1 week
    }
})

export const getUniqueBuyersCountForThisProduct = webMethod(Permissions.Anyone, async (productId) => {
    try {
        const result = await (await weivData.native("Gheblo/WixeComOrders", true)).aggregate([
            {
                $match: {
                    "entity.lineItems.catalogReference.catalogItemId": productId
                }
            },
            {
                $unwind: "$entity.lineItems"
            },
            {
                $match: {
                    "entity.lineItems.catalogReference.catalogItemId": productId
                }
            },
            {
                $group: {
                    _id: "$entity.buyerInfo.memberId"
                }
            },
            {
                $count: "totalUniqueUsers"
            }
        ]).toArray();

        return result[0].totalUniqueUsers;
    } catch (err) {
        throw new Error(`Error when getting unique buyers sum from orders collection, ${err}`);
    }
}, {
    cache: {
        tags: ["product-unique-buyers-count"],
        ttl: 172800 // cache 48 hours
    }
});