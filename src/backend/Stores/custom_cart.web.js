import { currentCart, checkout } from "wix-ecom-backend";
import { webMethod, Permissions } from 'wix-web-module';
import weivData from '@exweiv/weiv-data';

export const getCurrentCart = webMethod(Permissions.Anyone, async () => {
    try {
        const cartData = await currentCart.estimateCurrentCartTotals();
        const lineItems = await setupLineItems(cartData.cart.lineItems);

        return {
            cartData: {
                ...cartData,
                cart: {
                    ...cartData.cart,
                    lineItems
                }
            }
        };
    } catch (err) {
        throw new Error(`Error while fetching current cart: ${err}`);
    }
});

export const removeItemFromCart = webMethod(Permissions.Anyone, async (itemIds) => {
    try {
        await currentCart.removeLineItemsFromCurrentCart(itemIds);
        return getCurrentCart();
    } catch (err) {
        throw new Error(`Error while removing item from cart: ${err}`);
    }
});

export const updateCurrentCartItem = webMethod(Permissions.Anyone, async (currentLineItems, newLineItem) => {
    try {
        const { itemId, productId, choices, variantId, quantity } = newLineItem;
        const lineItemsExceptNewOne = currentLineItems.filter(li => li._id !== itemId);

        await currentCart.updateCurrentCart({
            lineItems: [...lineItemsExceptNewOne, {
                _id: itemId,
                catalogReference: {
                    appId: "215238eb-22a5-4c36-9e7b-e7c08025e04e", // Wix Stores ID
                    catalogItemId: productId,
                    options: {
                        options: choices,
                        variantId
                    }
                },
                quantity
            }]
        });

        return await getCurrentCart();
    } catch (err) {
        throw new Error(`Error while updating current cart items: ${err}`);
    }
});

export const getVariantSockQuantity = webMethod(Permissions.Anyone, async (choices, productId) => {
    try {
        let filters = {}

        for (const choice of Object.entries(choices)) {
            filters[`entity.choices.${choice[0]}`] = choice[1];
        }

        const { entity } = await (await weivData.native("Gheblo/WixStoresVariants", true)).findOne({ ...filters, "entity.productId": productId });
        return entity.stock.quantity;
    } catch (err) {
        throw new Error(`Error while fetching variant data: ${err}`);
    }
});

export const getCheckoutURL = webMethod(Permissions.Anyone, async (checkoutId) => {
    try {
        const checkoutURL = await checkout.getCheckoutUrl(checkoutId);
        return checkoutURL.checkoutUrl;
    } catch (err) {
        throw new Error(`Error while fetching checkout URL from current cart: ${err}`);
    }
});

async function setupLineItems(lineItems) {
    try {
        let updatedLineItems = await lineItems.map(async (lineItem) => await getLineItemData(lineItem));
        return await Promise.all(updatedLineItems);
    } catch (err) {
        throw new Error(`Error while fetching product images for line items: ${err}`);
    }
}

async function getLineItemData(lineItem) {
    try {
        const variantId = lineItem.catalogReference.options.variantId;
        let options = lineItem.catalogReference.options.options;

        const productData = await (await weivData.native("Gheblo/WixStoresProducts", true)).findOne({ "entity._id": lineItem.catalogReference.catalogItemId });

        if (!options) {
            const { entity } = await (await weivData.native("Gheblo/WixStoresVariants", true)).findOne({ "entity.variantId": variantId });
            options = entity.choices;
        }

        if (options["Color"]) {
            const colorSelection = options["Color"];
            const varinatImages = await weivData.query("Gheblo/CustomProductDetails")
                .eq("entity.product", lineItem.catalogReference.catalogItemId)
                .find({ suppressAuth: true, suppressHooks: true, omitTotalCount: true });

            const variantImage = varinatImages.items.find(variant => variant.entity.color === colorSelection).entity.images[0].src;

            return {
                ...lineItem,
                variantImage,
                productData: productData.entity,
                imagesByColor: varinatImages.items.map(i => i.entity),
                options
            }
        }

        return { ...lineItem, options, productData: productData.entity };
    } catch (err) {
        throw new Error(`Error while fetching product data for line item: ${err}`);
    }
}