import weivData from '@exweiv/weiv-data';
import wixData from 'wix-data';

export async function wixStores_onCollectionCreated(event) {
    try {
        const collectionId = event._id;
        console.log(`Collection Created with id: ${collectionId}`);
        const collection = await wixData.get("Stores/Collections", collectionId, { suppressAuth: true, consistentRead: true });
        await (await weivData.native("Gheblo/WixStoresCollections", true)).updateOne({ "entity._id": collectionId }, { $set: { entity: collection } }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when creating new collection of Wix Stores via events, details: ${err}`);
    }
}

export async function wixStores_onCollectionUpdated(event) {
    try {
        const collectionId = event.collectionId;
        console.log(`Collection Updated with id: ${collectionId}`);
        const collection = await wixData.get("Stores/Collections", collectionId, { suppressAuth: true, consistentRead: true });
        await (await weivData.native("Gheblo/WixStoresCollections", true)).updateOne({ "entity._id": collectionId }, { $set: { entity: collection } }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when updating collection of Wix Stores via events, details: ${err}`);
    }
}

export async function wixStores_onCollectionDeleted(event) {
    try {
        const collectionId = event.collectionId;
        console.log(`Collection Deleted with id: ${collectionId}`);
        await (await weivData.native("Gheblo/WixStoresCollections", true)).deleteOne({ "entity._id": collectionId });
    } catch (err) {
        throw new Error(`Error when deleting collection of Wix Stores via events, details: ${err}`);
    }
}