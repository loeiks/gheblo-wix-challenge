import weivData from '@exweiv/weiv-data';
import wixData from 'wix-data';
import { sleep } from '../Helpers/sleep';

export async function wixStores_onProductCreated(event) {
    try {
        const productId = event._id;
        console.log(`Product Created with id: ${productId}`);

        await sleep(1000);

        // Get Created Product Data
        const [productResult, variants, inventoryItems] = await Promise.all([
            wixData.query("Stores/Products").eq("_id", productId).include("collections").find({ suppressAuth: true, consistentRead: true, appOptions: { includeVariants: true, includeHiddenProducts: true }, omitTotalCount: false }),
            wixData.query("Stores/Variants").eq("productId", productId).limit(100).find({ suppressAuth: true, consistentRead: true }),
            wixData.query("Stores/InventoryItems").eq("productId", productId).limit(100).find({ suppressAuth: true, consistentRead: true })
        ]);

        if (productResult.items.length === 0) {
            console.error("Product not found");
        }

        const product = {
            ...productResult.items[0],
            collections: productResult.items[0].collections.map(c => c._id)
        };

        const variantUpdates = variants.items.map((item) => {
            return {
                "updateOne": {
                    "filter": { "entity._id": item._id },
                    "update": { $set: { entity: item } },
                    upsert: true
                }
            }
        });

        const inventoryItemsUpdates = inventoryItems.items.map((item) => {
            return {
                "updateOne": {
                    "filter": { "entity._id": item._id },
                    "update": { $set: { entity: item } },
                    upsert: true
                }
            }
        });

        // Sync Product Data to MongoDB Cluster
        await Promise.all([
            await (await weivData.native("Gheblo/WixStoresProducts", true)).updateOne({ "entity._id": productId }, { $set: { entity: product } }, { upsert: true }),
            await (await weivData.native("Gheblo/WixStoresVariants", true)).bulkWrite(variantUpdates, { ordered: false }),
            await (await weivData.native("Gheblo/WixStoresInventoryItems", true)).bulkWrite(inventoryItemsUpdates, { ordered: false })
        ]);
    } catch (err) {
        throw new Error(`Error when creating new product of Wix Stores via event details, ${err}`);
    }
}

export async function wixStores_onProductUpdated(event) {
    try {
        const productId = event.productId;
        console.log(`Product Updated with id: ${productId}`);

        await sleep(1000);

        // Get Updated Product Data
        const [productResult, variants, inventoryItems] = await Promise.all([
            wixData.query("Stores/Products").eq("_id", productId).include("collections").find({ suppressAuth: true, consistentRead: true, appOptions: { includeVariants: true, includeHiddenProducts: true }, omitTotalCount: false }),
            wixData.query("Stores/Variants").eq("productId", productId).limit(100).find({ suppressAuth: true, consistentRead: true }),
            wixData.query("Stores/InventoryItems").eq("productId", productId).limit(100).find({ suppressAuth: true, consistentRead: true })
        ]);

        if (productResult.items.length === 0) {
            console.error("Product not found");
        }

        const product = {
            ...productResult.items[0],
            collections: productResult.items[0].collections.map(c => c._id)
        };

        const variantUpdates = variants.items.map((item) => {
            return {
                "updateOne": {
                    "filter": { "entity._id": item._id },
                    "update": { $set: { entity: item } },
                    upsert: true
                }
            }
        });

        const inventoryItemsUpdates = inventoryItems.items.map((item) => {
            return {
                "updateOne": {
                    "filter": { "entity._id": item._id },
                    "update": { $set: { entity: item } },
                    upsert: true
                }
            }
        });

        // Sync Product Data to MongoDB Cluster
        await Promise.all([
            (await weivData.native("Gheblo/WixStoresProducts", true)).updateOne({ "entity._id": productId }, { $set: { entity: product } }, { upsert: true }),
            (await weivData.native("Gheblo/WixStoresVariants", true)).bulkWrite(variantUpdates, { ordered: false }),
            (await weivData.native("Gheblo/WixStoresInventoryItems", true)).bulkWrite(inventoryItemsUpdates, { ordered: false })
        ]);
    } catch (err) {
        throw new Error(`Error when updating product of Wix Stores via event details, ${err}`);
    }
}

export async function wixStores_onProductDeleted(event) {
    try {
        const productId = event.productId;
        console.log(`Product Deleted with id: ${productId}`);
        await Promise.all([
            (await weivData.native("Gheblo/WixStoresProducts", true)).deleteOne({ "entity._id": productId }),
            (await weivData.native("Gheblo/WixStoresVariants", true)).deleteMany({ "entity.productId": productId }),
            (await weivData.native("Gheblo/WixStoresInventoryItems", true)).deleteMany({ "entity.productId": productId })
        ]);
    } catch (err) {
        throw new Error(`Error when deleting product of Wix Stores via event details, ${err}`);
    }
}