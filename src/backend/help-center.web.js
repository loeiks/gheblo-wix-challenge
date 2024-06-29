import wixData from 'wix-data';
import { Permissions, webMethod } from "wix-web-module";

export const reportFeedback = webMethod(Permissions.Anyone, async (articleId, feedback) => {
    try {
        const article = await wixData.get("HelpArticles", articleId);
        let newFeedback = article.totalFeedback + 1;
        let feedbackTags;

        if (feedback) {
            if (article.reports) {
                feedbackTags = article.reports.concat([feedback]);
            } else {
                feedbackTags = [feedback];
            }
        }

        await wixData.update("HelpArticles", { ...article, totalFeedback: newFeedback, reports: feedbackTags }, { suppressAuth: true });
        return true;
    } catch (err) {
        throw Error(`Error when adding a new report to current article ${err}`);
    }
});