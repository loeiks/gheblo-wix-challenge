import weivData from '@exweiv/weiv-data';
import { currentUser } from 'wix-users-backend';
import { webMethod, Permissions } from 'wix-web-module';
import moment from 'moment';

export const getRecentOrdersOfCurrentMember = webMethod(Permissions.SiteMember, async () => {
    try {
        const dateFilterDate = moment().subtract(30, 'days').toDate();

        const currentMemberId = currentUser.id;
        const orders = await weivData.query("Gheblo/WixeComOrders")
            .descending("entity._createdDate")
            .eq("entity.buyerInfo.memberId", currentMemberId)
            .gt("entity._createdDate", dateFilterDate)
            .limit(7)
            .find({ suppressAuth: true, suppressHooks: true });

        return orders.items;
    } catch (err) {
        throw new Error(`Error when getting recent orders of current member, ${err}`);
    }
}, {
    cache: {
        tags: ["recent-orders-of-current-member"],
        ttl: 3600
    }
});