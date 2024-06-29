import wixData from "wix-data";
import { Permissions, webMethod } from "wix-web-module";
// import { isNil } from 'lodash';

export const searchProducts = webMethod(Permissions.Anyone, async (phrase) => {
    const { items } = await wixData
        .query("Stores/Products")
        .contains("name", phrase)
        .or(wixData.query("Stores/Products").contains("description", phrase))
        .or(wixData.query("Stores/Products").contains("slug", phrase))
        .fields("_id", "sku", "mainMedia", "price", "discountedPrice", "inStock", "name", "trackInventory", "productPageUrl")
        .find({ suppressAuth: true });

    return items;
    // let newItems = await items.map(async (item) => {
    //     if (item.trackInventory === true && item.inStock === true) {
    //         const variantResult = await wixData.query("Stores/Variants").eq("managedVariant", true).eq("productId", item._id).fields("stock", "choices").find({ suppressAuth: true });
    //         let variants = variantResult.items;

    //         let sizeData = variants.map((variant) => {
    //             if (variant.stock.trackQuantity === true && variant.stock.inStock === true) {
    //                 return {
    //                     size: variant.choices["Size"],
    //                     quantity: variant.stock.quantity
    //                 }
    //             } else {
    //                 return null;
    //             }
    //         }).filter(value => !isNil(value));

    //         let newSizeData = {};
    //         for (const data of sizeData) {
    //             newSizeData[data.size] = (newSizeData[data.size] || 0) + data.quantity;
    //         }

    //         return {
    //             ...item,
    //             productOptions: newSizeData,
    //         }
    //     } else {
    //         return item;
    //     }
    // })

    // newItems = await Promise.all(newItems);
    // return newItems;
});