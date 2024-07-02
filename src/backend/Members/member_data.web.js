import { webMethod, Permissions } from "wix-web-module";
import { members, currentMember } from "wix-members-backend";

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

export const getCurrentMemberProfileData = webMethod(Permissions.Anyone, async (memberId) => {
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