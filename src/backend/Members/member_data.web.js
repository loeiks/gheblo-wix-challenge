import { webMethod, Permissions } from "wix-web-module";
import { members, currentMember } from "wix-members-backend";
import weivData from '@exweiv/weiv-data';
import { currentUser } from "wix-users-backend";

export const getMemberProfileData = webMethod(Permissions.Anyone, async (memberId) => {
    try {
        return members.getMember(memberId, { fieldsets: ["PUBLIC"] });
    } catch (err) {
        throw new Error(`Error when getting member profile data, ${err}`);
    }
}, {
    cache: {
        tags: ["member-public-data"],
        ttl: 43200 // cache for 12 hours
    }
});

export const getCurrentMemberProfileData = webMethod(Permissions.Anyone, async () => {
    try {
        return currentMember.getMember({ fieldsets: ["PUBLIC"] });
    } catch (err) {
        throw new Error(`Error when getting member profile data, ${err}`);
    }
}, {
    cache: {
        tags: ["current-member-public-data"],
        ttl: 43200 // cache for 12 hours
    }
});

export const getCurrentMemberEComData = webMethod(Permissions.SiteMember, async () => {
    try {
        const currentMemberId = currentUser.id;

        const productReviews = await weivData.query("Gheblo/ProductReviews").eq("_owner", currentMemberId).fields("_id").limit(1000).find({ suppressAuth: true, suppressHooks: true });
        const totalProductReviews = productReviews.length;

        const productFavorites = await weivData.query("Gheblo/ProductFavs").eq("_owner", currentMemberId).fields("_id").limit(1000).find({ suppressAuth: true, suppressHooks: true });
        const totalProductFavorites = productFavorites.length;

        const orders = await weivData.query("Gheblo/WixeComOrders").eq("entity.buyerInfo.memberId", currentMemberId).fields("_id").limit(100).find({ suppressAuth: true, suppressHooks: true });
        const totalOrders = orders.length;

        const profileData = await getCurrentMemberProfileData();

        return {
            profileData,
            totalProductReviews,
            totalProductFavorites,
            totalOrders,
        }
    } catch (err) {
        throw new Error(`Error when getting current member eCommerce data, ${err}`);
    }
});