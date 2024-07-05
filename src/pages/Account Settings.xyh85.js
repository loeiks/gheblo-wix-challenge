import { setupHeader } from 'public/MemberPages/memberHeaders';
import { getCurrentMemberEComData } from 'backend/Members/member_data.web.js';
$w.onReady(async function () {
    const data = await getCurrentMemberEComData();
    setupHeader(data);
});