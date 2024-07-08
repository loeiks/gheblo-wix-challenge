import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module';

// create new question for a product
export const createQuestion = webMethod(Permissions.SiteMember, async (text, productId) => {
    try {
        if (!text || !productId) {
            throw new Error("Missing required parameters: text, productId");
        }

        const commentData = { productId, text, replies: [] };
        return await weivData.insert("Gheblo/Questions", commentData, { suppressAuth: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error when inserting new comment for question system, ${err}`);
    }
});

// update question body
export const updateQuestion = webMethod(Permissions.SiteMember, async (text, questionId) => {
    try {
        if (!questionId || !text) {
            throw new Error("Missing required parameters: questionId, text");
        }

        const commentData = { _id: questionId, text };
        return await weivData.update("Gheblo/Questions", commentData, { suppressAuth: true, onlyOwner: true, suppressHooks: true });
    } catch (err) {
        throw new Error(`Error when updating comment for question system, ${err}`);
    }
});

// delete question and all its replies
export const deleteQuestion = webMethod(Permissions.SiteMember, async (questionId) => {
    try {
        if (!questionId) {
            throw new Error("Missing required parameters: questionId");
        }

        // Delete all replies associated with the question
        await (await weivData.native("Gheblo/QuestionReplies", true)).deleteMany({ "questionId": questionId });
        // Delete the question itself
        await weivData.remove("Gheblo/Questions", questionId, { suppressAuth: true, onlyOwner: true, suppressHooks: true });
        return true;
    } catch (err) {
        throw new Error(`Error when deleting comment from question system, ${err}`);
    }
});

export const createReply = webMethod(Permissions.SiteMember, async (questionId, text, productId) => {
    try {
        if (!questionId || !text || !productId) {
            throw new Error("Missing required parameters: questionId, text, productId");
        }

        // Creat reply and associate it with the question
        const replyData = { productId, questionId, text, };
        const insertedReply = await weivData.insert("Gheblo/QuestionReplies", replyData, { suppressAuth: true, suppressHooks: true });
        await weivData.insertReference("Gheblo/Questions", "replies", questionId, insertedReply._id, { suppressAuth: true, suppressHooks: true });
        return insertedReply;
    } catch (err) {
        throw new Error(`Error when adding reply to comment from question system, ${err}`);
    }
});

export const updateReply = webMethod(Permissions.SiteMember, async (replyId, text) => {
    try {
        if (!replyId || !text) {
            throw new Error("Missing required parameters: replyId, text)");
        }

        const updatedReply = await weivData.update("Gheblo/QuestionReplies", { _id: replyId, text }, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
        return updatedReply;
    } catch (err) {
        throw new Error(`Error when updating reply to comment from question system, ${err}`);
    }
});

export const deleteReply = webMethod(Permissions.SiteMember, async (replyId) => {
    try {
        if (!replyId) {
            throw new Error("Missing required parameters: replyId");
        }

        await weivData.remove("Gheblo/QuestionReplies", replyId, { suppressAuth: true, suppressHooks: true, onlyOwner: true });
        return true;
    } catch (err) {
        throw new Error(`Error when updating reply to comment from question system, ${err}`);
    }
});