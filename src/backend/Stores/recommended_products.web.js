import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';
import { webMethod, Permissions } from 'wix-web-module';

export const getRecommendedProducts = webMethod(Permissions.Anyone, async () => {
    try {
        const products = await weivData.query("Gheblo/WixStoresProducts").contains("entity.collections", "107fd4bc-cde5-d269-bbac-2084b61fdf7b").limit(4).find({ suppressAuth: true, suppressHooks: true });
        return products.items.map(product => product.entity);
    } catch (err) {
        throw new Error(`Failed to fetch recommended products: ${err}`);
    }
});