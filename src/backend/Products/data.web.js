import wixData from 'wix-data';
import { Permissions, webMethod } from "wix-web-module";
import { v4 as uuidv4 } from 'uuid';

export const getProductData = webMethod(Permissions.Anyone, async (slug) => {
    try {
        const productData = await wixData.query("Stores/Products").eq("slug", slug).find({ suppressAuth: true });
        const productVariants = await wixData.query("Stores/Variants").eq("productId", productData.items[0]._id).find({ suppressAuth: true });
        const images = await wixData.query("Products").eq("product", productData.items[0]._id).find({ suppressAuth: true });
        const product = productData.items[0];

        if (productData.length > 0) {
            if (product.productOptions["Color"]) {
                const productImagesByColor = images.items.map((item) => {
                    const colorVarinatData = product.productOptions["Color"].choices.filter((choice) => {
                        return choice.description === item.color && choice.visible === true;
                    })

                    if (colorVarinatData.length > 0) {
                        return {
                            ...item,
                            value: colorVarinatData[0].value
                        }
                    }
                })

                return {
                    ...product,
                    variants: productVariants,
                    productVariantImages: { color: images.items[0].color, images: images.items[0].images.map((i) => { return { ...i, _id: uuidv4() } }) },
                    productImagesByColor
                };
            } else {
                return {
                    ...product,
                    variants: productVariants,
                    productVariantImages: { color: images.items[0].color, images: images.items[0].images.map((i) => { return { ...i, _id: uuidv4() } }) }
                };
            }
        }
    } catch (err) {
        console.error(err);
    }
});