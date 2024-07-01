import weivData from '@exweiv/weiv-data';
const collectionName = "Gheblo/CustomProductDetails";

export async function Products_afterInsert(item, context) {
    try {
        await (await weivData.native(collectionName, true)).insertOne({ entity: item });
    } catch (err) {
        throw new Error(`Error when inserting new item from products collection at Wix CMS, ${err}`);
    }
}

export async function Products_afterUpdate(item, context) {
    try {
        await (await weivData.native(collectionName, true)).replaceOne({ "entity._id": item._id }, { entity: item }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when updating item from products collection at Wix CMS, ${err}`);
    }
}

export async function Products_afterRemove(item, context) {
    try {
        await (await weivData.native(collectionName, true)).deleteOne({ "entity._id": item._id });
    } catch (err) {
        throw new Error(`Error when deleting item from products collection at Wix CMS, ${err}`);
    }
}