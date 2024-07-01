import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';
import { webMethod, Permissions } from 'wix-web-module';

export const addProductToFavs = webMethod(Permissions.SiteMember, async (productId) => {
    try {
        return await weivData.insert("Gheblo/ProductFavs", {
            productId
        }, { suppressAuth: true });
    } catch (err) {
        throw new Error(`Error when saving product into member's favs, ${err}`);
    }
})

export const checkIsInFavs = webMethod(Permissions.SiteMember, async (productId) => {
    try {
        const isInFavs = await (await weivData.native("Gheblo/ProductFavs", true)).findOne({ "productId": productId, "_owner": currentUser.id });

        if (isInFavs) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        throw new Error(`Error when checking if product inside of member's favs, ${err}`);
    }
});