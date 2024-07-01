import { Permissions, webMethod } from "wix-web-module";
import weivData from '@exweiv/weiv-data';
import { v4 as uuidv4 } from 'uuid';

export const getProductData = webMethod(Permissions.Anyone, async (slug) => {
    try {
        let returnedProductData;
        const productQueryResult = await weivData.query("Gheblo/WixStoresProducts").eq("entity.slug", slug).find({ suppressAuth: true });
        const product = productQueryResult.items[0].entity;

        if (productQueryResult.length > 0) {
            const productVariants = await weivData.query("Gheblo/WixStoresVariants").eq("entity.productId", product._id).find({ suppressAuth: true });

            returnedProductData = {
                ...product,
                productVariants: productVariants.items.map(i => i.entity)
            }

            if (product.productOptions["Color"]) {
                const imagesQueryResult = await weivData.query("Gheblo/CustomProductDetails").eq("entity.product", product._id).find({ suppressAuth: true });

                const productImagesByColor = imagesQueryResult.items.map((item) => {
                    const colorVarinatData = product.productOptions["Color"].choices.filter((choice) => {
                        return choice.description === item.entity.color && choice.visible === true;
                    })

                    if (colorVarinatData.length > 0) {
                        return {
                            ...item.entity,
                            value: colorVarinatData[0].value
                        }
                    }
                })

                returnedProductData.productImagesByColor = productImagesByColor;
            }
        }

        return returnedProductData;
    } catch (err) {
        throw new Error(`Error when getting product data/details via slug of the product, ${err}`);
    }
});