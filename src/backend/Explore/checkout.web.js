import { webMethod, Permissions } from "wix-web-module";
import { currentCart, checkout } from 'wix-ecom-backend';

export const getCheckoutURLForCurrentCart = webMethod(Permissions.Anyone, async () => {
    try {
        //@ts-ignore
        const { checkoutId } = await currentCart.createCheckoutFromCurrentCart({ channelType: "WEB" });
        const checkoutURL = await checkout.getCheckoutUrl(checkoutId);
        return checkoutURL.checkoutUrl;
    } catch (err) {
        throw new Error(`Error while getting checkout url for current cart, ${err}`);
    }
});