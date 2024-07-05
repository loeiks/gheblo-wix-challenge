import { webMethod, Permissions } from "wix-web-module";
import weivData from "@exweiv/weiv-data";
import { currentUser } from "wix-users-backend";

export const getCurrentMemberVideos = webMethod(Permissions.SiteMember, async (skip) => {
    try {
        const currentMemberId = currentUser.id;
        const videos = await weivData.query("Gheblo/ShortVideos").eq("_owner", currentMemberId).skip(skip || 0).limit(100).find({ suppressAuth: true, suppressHooks: true });
        return videos;
    } catch (err) {
        throw new Error(`Error while getting member videos: ${err}`);
    }
});