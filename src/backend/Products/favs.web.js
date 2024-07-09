import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';
import { webMethod, Permissions } from 'wix-web-module';

export const addProductToFavs = webMethod(Permissions.SiteMember, async (productId) => {
    try {
        await weivData.insert("Gheblo/ProductFavs", {
            productId
        }, { suppressAuth: true, suppressHooks: true });
        return true;
    } catch (err) {
        throw new Error(`Error when saving product into member's favs, ${err}`);
    }
});

export const removeProductFromFavs = webMethod(Permissions.SiteMember, async (productId) => {
    try {
        await (await weivData.native("Gheblo/ProductFavs", true)).deleteOne({ "productId": productId, "_owner": currentUser.id });
        return true;
    } catch (err) {
        throw new Error(`Error when removing product from member's favs, ${err}`);
    }
})

export const checkIsInFavs = webMethod(Permissions.Anyone, async (productId) => {
    try {
        if (currentUser.loggedIn) {
            const isInFavs = await (await weivData.native("Gheblo/ProductFavs", true)).findOne({ "productId": productId, "_owner": currentUser.id });
            return isInFavs ? true : false;
        } else {
            return false;
        }
    } catch (err) {
        throw new Error(`Error when checking if product inside of member's favs, ${err}`);
    }
});

export const queryProductFavs = webMethod(Permissions.SiteMember, async () => {
    try {
        const favs = await (await weivData.native("Gheblo/ProductFavs", true)).find({ "_owner": currentUser.id }).toArray();
        return favs;
    } catch (err) {
        throw new Error(`Error when querying member's favs, ${err}`);
    }
});

export const toggleFavoriteProduct = webMethod(Permissions.SiteMember, async (productId) => {
    try {
        if (currentUser.loggedIn) {
            const isInFavs = await (await weivData.native("Gheblo/ProductFavs", true)).findOne({ "productId": productId, "_owner": currentUser.id });

            if (isInFavs) {
                await removeProductFromFavs(productId);
                return false;
            } else {
                await addProductToFavs(productId);
                return true;
            }
        } else {
            return false;
        }
    } catch (err) {
        throw new Error(`Error when toggling favorite status of product for member, ${err}`);
    }
})