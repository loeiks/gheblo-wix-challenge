import weivData from '@exweiv/weiv-data';
import { members } from "wix-members-backend";
import * as wixAuth from 'wix-auth';

const fullCollectionName = "Gheblo/WixMembersData";
const profileCollectionName = "Gheblo/WixMembersProfileData";

export async function wixMembers_onMemberUpdated(event) {
    try {
        const memberId = event.entity._id;
        console.log("Member Updated", memberId)
        const elevatedGetMember = wixAuth.elevate(members.getMember);
        const memberDataFull = await elevatedGetMember(memberId, { fieldsets: ["FULL"] });

        await (await weivData.native(fullCollectionName, true)).updateOne({ "entity._id": memberId }, { $set: { entity: memberDataFull } }, { upsert: true });
        await (await weivData.native(profileCollectionName, true)).updateOne({ "entity._id": memberId }, { $set: { entity: getPublicData(memberDataFull) } }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when updating member data via events, details: ${err}`);
    }
}

export async function wixMembers_onMemberCreated(event) {
    try {
        const memberId = event.entity._id;
        console.log("Member Created", memberId)
        const elevatedGetMember = wixAuth.elevate(members.getMember);
        const memberDataFull = await elevatedGetMember(memberId, { fieldsets: ["FULL", "PUBLIC"] });
        await (await weivData.native(fullCollectionName, true)).insertOne({ entity: memberDataFull });
        await (await weivData.native(profileCollectionName, true)).insertOne({ entity: getPublicData(memberDataFull) });
    } catch (err) {
        throw new Error(`Error when creating member data via events, details: ${err}`);
    }
}

export async function wixMembers_onMemberDeleted(event) {
    try {
        const memberId = event.metadata.entityId;
        console.log("Member Deleted", memberId)
        await (await weivData.native(fullCollectionName, true)).deleteOne({ "entity._id": memberId });
        await (await weivData.native(profileCollectionName, true)).deleteOne({ "entity._id": memberId });
    } catch (err) {
        throw new Error(`Error when creating member data via events, details: ${err}`);
    }
}

// HELPERS
/**
 * 
 * @param {import('wix-members-backend').Members.Member} fullData 
 */
function getPublicData(fullData) {
    return {
        profile: fullData.profile,
        contactId: fullData.contactId,
        _updatedDate: fullData._updatedDate,
        _createdDate: fullData._createdDate,
        _id: fullData._id
    }
}