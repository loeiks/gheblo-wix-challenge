import { currentMember } from 'wix-members-backend';

export async function getCurrentMemberData() {
    try {
        return await currentMember.getMember({ fieldsets: ["FULL"] });
    } catch (err) {
        console.error(err);
    }
}