import { webMethod, Permissions } from "wix-web-module";
import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';

export const getCurrentMemberFavoriteProducts = webMethod(Permissions.SiteMember, async (skip = 0) => {
    try {
        const currentMemberId = currentUser.id;
        const favoriteProductsResult = await weivData.query("Gheblo/ProductFavs")
            .eq("_owner", currentMemberId)
            .skip(skip || 0)
            .include({
                collectionName: "WixStoresProducts",
                fieldName: "productId",
                foreignField: "entity._id",
                as: "product",
            })
            .find({ suppressAuth: true, suppressHooks: true });

        return favoriteProductsResult;
    } catch (err) {
        throw new Error(`Error while getting current member favorite products: ${err}`);
    }
});