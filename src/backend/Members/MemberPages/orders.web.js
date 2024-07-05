import { webMethod, Permissions } from "wix-web-module";
import { currentUser } from "wix-users-backend";
import weivData from '@exweiv/weiv-data';

export const getCurrentMemberOrders = webMethod(Permissions.SiteMember, async () => {
    try {
        const currentMemberId = currentUser.id;
        const ordersResult = await weivData.query("Gheblo/WixeComOrders").descending("entity._createdDate").eq("entity.buyerInfo.memberId", currentMemberId).find({ suppressAuth: true, suppressHooks: true });
        return ordersResult;
    } catch (err) {
        throw new Error(`Error while getting current member orders: ${err}`);
    }
});