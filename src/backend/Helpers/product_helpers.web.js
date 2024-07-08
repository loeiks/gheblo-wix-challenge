import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';

export const getProductBySlug = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        if (!productSlug) {
            throw new Error("Product slug is required");
        }

        const product = await (await weivData.native("Gheblo/WixStoresProducts", true)).findOne({ "entity.slug": productSlug });
        return product.entity;
    } catch (err) {
        throw new Error(`Error when getting product id via slug, ${err}`);
    }
}, {
    cache: {
        tags: ["product-ids-by-slug"],
        ttl: 604800 // cache 1 week
    }
})

export const getUniqueBuyersCountForThisProduct = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        if (!productSlug) {
            throw new Error("Product slug is required");
        }

        const product = await getProductBySlug(productSlug);
        const result = await (await weivData.native("Gheblo/WixeComOrders", true)).aggregate([
            {
                $match: {
                    "entity.lineItems.catalogReference.catalogItemId": product._id
                }
            },
            {
                $unwind: "$entity.lineItems"
            },
            {
                $match: {
                    "entity.lineItems.catalogReference.catalogItemId": product._id
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

        if (result.length > 0) {
            return result[0].totalUniqueUsers;
        } else {
            return 0;
        }
    } catch (err) {
        throw new Error(`Error when getting unique buyers sum from orders collection, ${err}`);
    }
}, {
    cache: {
        tags: ["product-unique-buyers-count"],
        ttl: 172800 // cache 48 hours
    }
});