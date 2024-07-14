import { orders } from 'wix-ecom-backend';
import { webMethod, Permissions } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import * as wixAuth from 'wix-auth';
import weivData from '@exweiv/weiv-data';
import { invoices } from 'wix-billing-backend';

export const cancelOrder = webMethod(Permissions.SiteMember, async (orderId, reasonToSave) => {
    try {
        const elevatedGetOrder = wixAuth.elevate(orders.getOrder);
        const order = await elevatedGetOrder(orderId);
        const currentMemberId = currentUser.id;

        if (order.buyerInfo.memberId === currentMemberId) {
            const elevatedCancelOrder = wixAuth.elevate(orders.cancelOrder);
            const { order } = await elevatedCancelOrder(orderId, {
                customMessage: reasonToSave,
                restockAllItems: true,
                sendOrderCanceledEmail: true
            });

            return order;
        } else {
            throw new Error("You are not authorized to cancel this order");
        }
    } catch (err) {
        console.error(err);
    }
});

export const createReturnRequest = webMethod(Permissions.SiteMember, async (orderId, returnRequest) => {
    try {
        if (!orderId || !returnRequest) {
            throw new Error("Invalid orderId or return request data");
        }

        const { returnType, returnAddress, selectedDropoffPoint, returningProductIds } = returnRequest;
        const currentOrder = await (await weivData.native("Gheblo/WixeComOrders")).findOne({ "entity._id": orderId });

        if (!currentOrder) {
            throw new Error("Invalid orderId, order not found");
        }

        const currentlyReturningProductIds = currentOrder.entity?.returnRequest?.returnRequestIds || [];

        let filteredReturningProductIds = returningProductIds;
        if (returningProductIds && returningProductIds.length > 0) {
            filteredReturningProductIds = returningProductIds.filter(id => !currentlyReturningProductIds.includes(id));
        }

        const returnData = {
            returnType,
            returnStatus: "PENDING",
            returningProductIds: filteredReturningProductIds
        }

        if (returnType === "dropoff") {
            returnData.selectedDropoffPoint = selectedDropoffPoint;
        } else {
            returnData.returnAddress = returnAddress;
        }

        const order = await (await weivData.native("Gheblo/WixeComOrders")).updateOne({ "entity._id": orderId }, {
            $set: {
                "entity.returnRequest": {
                    ...returnData
                }
            }
        });

        return order;
    } catch (err) {
        throw new Error(`Error while creating return request: ${err}`);
    }
});

export const getOrderInvoiceURL = webMethod(Permissions.SiteMember, async (orderId) => {
    try {
        const { id } = await invoices.getInvoice(orderId);
        return invoices.createInvoicePreviewUrl(id, { suppressAuth: true });
    } catch (err) {
        throw new Error(`Error while getting order invoice: ${err}`);
    }
});