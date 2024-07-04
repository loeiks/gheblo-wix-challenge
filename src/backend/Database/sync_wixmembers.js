import weivData from '@exweiv/weiv-data';
import { members } from "wix-members-backend";
import * as wixAuth from 'wix-auth';

const fullCollectionName = "Gheblo/WixMembersData";
const profileCollectionName = "Gheblo/WixMembersProfileData";

export async function wixMembers_onMemberUpdated(event) {
    try {
        console.log("Member Updated")
        const elevatedGetMember = wixAuth.elevate(members.getMember);
        const memberDataFull = await elevatedGetMember(event.entity._id, { fieldsets: ["FULL"] });
        await (await weivData.native(fullCollectionName, true)).insertOne({ entity: memberDataFull });
        await (await weivData.native(profileCollectionName, true)).insertOne({ entity: getPublicData(memberDataFull) });
    } catch (err) {
        throw new Error(`Error when updating member data via events, details: ${err}`);
    }
}

export async function wixMembers_onMemberCreated(event) {
    try {
        console.log("Member Created")
        const elevatedGetMember = wixAuth.elevate(members.getMember);
        const memberDataFull = await elevatedGetMember(event.entity._id, { fieldsets: ["FULL", "PUBLIC"] });
        await (await weivData.native(fullCollectionName, true)).updateOne({ "entity._id": event.entity._id }, { entity: memberDataFull }, { upsert: true });
        await (await weivData.native(profileCollectionName, true)).updateOne({ "entity._id": event.entity._id }, { entity: getPublicData(memberDataFull) }, { upsert: true });
    } catch (err) {
        throw new Error(`Error when creating member data via events, details: ${err}`);
    }
}

export async function wixMembers_onMemberDeleted(event) {
    try {
        console.log("Member Deleted")
        await (await weivData.native(fullCollectionName, true)).deleteOne({ "entity._id": event.metadata.entityId });
        await (await weivData.native(profileCollectionName, true)).deleteOne({ "entity._id": event.metadata.entityId });
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