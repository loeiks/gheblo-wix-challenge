import weivData, { convertId } from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';
import { ObjectId } from 'mongodb';
import { getProductIdBySlug } from 'backend/Helpers/product_helpers.web.js';
import { getMemberProfileData } from 'backend/Members/member_data.web.js';

/**
 * @typedef {{
 * _id: ObjectId,
 * _updatedDate: Date,
 * _createdDate: Date,
 * _owner: string,
 * text: string,
 * productId: string,
 * replies: ObjectId[]
 * }} CustomComment
 */

export const createDiscussion = webMethod(Permissions.SiteMember, async (discussionBody, productId) => {
    try {
        const commentData = {
            productId,
            text: discussionBody,
            replies: []
        }

        return weivData.insert("Gheblo/Discussions", commentData, { suppressAuth: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error when inserting new comment for discussion system, ${err}`);
    }
});

export const updateDiscussion = webMethod(Permissions.SiteMember, async (discussionBody, discussionId) => {
    try {
        const commentData = {
            _id: discussionId,
            text: discussionBody
        }

        return weivData.update("Gheblo/Discussions", commentData, { suppressAuth: true, onlyOwner: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error when updating comment for discussion system, ${err}`);
    }
});

export const deleteDiscussion = webMethod(Permissions.SiteMember, async (discussionId) => {
    try {
        return weivData.remove("Gheblo/Discussions", discussionId, { suppressAuth: true, onlyOwner: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error when deleting comment from discussion system, ${err}`);
    }
});

export const addReplyToDiscussion = webMethod(Permissions.SiteMember, async (discussionId, replyText, productId) => {
    try {
        const replyData = {
            productId,
            text: replyText,
            parentDiscussionId: discussionId
        }

        const insertedReply = await weivData.insert("Gheblo/DiscussionReplies", replyData, { suppressAuth: true, suppressHooks: true });
        await weivData.insertReference("Gheblo/Discussions", "replies", discussionId, insertedReply._id, { suppressAuth: true, suppressHooks: true });
        return true;
    } catch (err) {
        throw new Error(`Error when adding reply to comment from discussion system, ${err}`);
    }
});

export const queryProductDiscussions = webMethod(Permissions.Anyone, async (productSlug, discussionId = undefined, skipCount = 0) => {
    try {
        const productId = await getProductIdBySlug(productSlug);
        const query = weivData.query("Gheblo/Discussions")
            .descending("_id")
            .eq("productId", productId)
            .include({
                collectionName: "DiscussionReplies",
                fieldName: "replies",
                sort: {
                    "_id": -1
                }
            })
            .skip(skipCount)
            .limit(4)

        if (discussionId) {
            query.eq("_id", convertId(discussionId))
        }

        const { items } = await query.find({ suppressAuth: true, suppressHooks: true });

        const comments = items.map(async (item) => {
            const memberData = await getMemberProfileData(item._owner);
            let newRepliesData;

            if (item.replies) {
                if (item.replies.length > 0) {
                    newRepliesData = await item.replies.map(async (reply) => {
                        const memberData = await getMemberProfileData(reply._owner);
                        return {
                            ...reply,
                            memberData,
                            _id: convertId(reply._id)
                        }
                    });
                }
            }

            if (newRepliesData) {
                newRepliesData = await Promise.all(newRepliesData)
            }

            return {
                ...item,
                memberData,
                replies: newRepliesData ? newRepliesData : item.replies
            }
        });

        return await Promise.all(comments);
    } catch (err) {
        throw new Error(`Error when querying discussion/s, ${err} - id ${discussionId}`);
    }
});