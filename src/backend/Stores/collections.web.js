import { Permissions, webMethod } from 'wix-web-module';
import weivData from '@exweiv/weiv-data';
import { checkIsInFavs } from 'backend/Products/favs.web.js';
import { recursivelyConvertIds } from '../Helpers/recursive_id_converter';
import { currentUser } from 'wix-users-backend';

export const getCollectionDataBySlug = webMethod(Permissions.Anyone, async (collectionSlug, skip) => {
    try {
        const collection = await (await weivData.native("Gheblo/WixStoresCollections", true)).findOne({ "entity.slug": collectionSlug });
        const { items } = await weivData.query("Gheblo/WixStoresProducts").hasSome("entity.collections", [collection.entity._id]).skip(skip || 0).limit(12).find({ suppressAuth: true, suppressHooks: true });
        const totalCount = await (await weivData.native("Gheblo/WixStoresProducts", true)).countDocuments({ "entity.collections": { $in: [collection.entity._id] } });

        let collectionProducts = recursivelyConvertIds(items).map(i => i.entity).map(async (item) => {
            if (currentUser.loggedIn) {
                const isInFavs = await checkIsInFavs(item._id);
                return {
                    ...item,
                    isInFavs
                }
            }

            return item;
        });

        collectionProducts = await Promise.all(collectionProducts);

        return {
            collectionProducts,
            collection: collection.entity,
            totalCount
        };
    } catch (err) {
        throw new Error(`Failed to fetch collection data/products by slug, ${err}`);
    }
}, {
    cache: {
        tags: ["collection-products"],
        ttl: 600 // cache for 10 min
    }
});