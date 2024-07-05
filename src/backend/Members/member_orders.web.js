import { orders } from 'wix-ecom-backend';
import { webMethod, Permissions } from 'wix-web-module';
import { currentUser } from 'wix-users-backend';
import * as wixAuth from 'wix-auth';

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