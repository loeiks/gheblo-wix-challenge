import weivData from '@exweiv/weiv-data';

export async function wixEcom_onOrderCreated(event) {
    const orderData = event.entity;
    const orderId = event.entity._id;

    console.log(`Order Created with id: ${orderId}`);

    try {
        await (await weivData.native("Gheblo/WixeComOrders", true)).updateOne({ "entity._id": orderId }, { $set: { entity: orderData } }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when creating new order data via events details, ${err}`);
    }
}

export async function wixEcom_onOrderUpdated(event) {
    const orderData = event.entity;
    const orderId = event.entity._id;

    console.log(`Order Updated with id: ${orderId}`);

    try {
        await (await weivData.native("Gheblo/WixeComOrders", true)).updateOne({ "entity._id": orderId }, { $set: { entity: orderData } }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when creating new order data via events details, ${err}`);
    }
}