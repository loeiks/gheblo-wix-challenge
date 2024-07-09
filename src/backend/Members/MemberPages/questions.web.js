import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';
import { currentUser } from 'wix-users-backend'; //@ts-ignore
import { recursivelyConvertIds } from '../../Helpers/recursive_id_converter';

export const queryMemberQuestionsAndReplies = webMethod(Permissions.SiteMember, async () => {
    try {
        const currentMemberId = currentUser.id;

        if (currentMemberId) {
            const memberQuestions = await weivData.query("Gheblo/Questions").eq("_owner", currentMemberId)
                .include({
                    collectionName: "WixStoresProducts",
                    foreignField: "entity._id",
                    fieldName: "productId",
                    as: "product"
                })
                .find({ suppressAuth: true, suppressHooks: true });

            const memberReplies = await weivData.query("Gheblo/QuestionReplies").eq("_owner", currentMemberId)
                .include({
                    collectionName: "WixStoresProducts",
                    foreignField: "entity._id",
                    fieldName: "productId",
                    as: "product"
                }).find({ suppressAuth: true, suppressHooks: true });

            return {
                questions: recursivelyConvertIds(memberQuestions.items),
                replies: recursivelyConvertIds(memberReplies.items),
            }
        }
    } catch (err) {
        throw new Error(`Error while querying member questions and replies: ${err}`);
    }
});