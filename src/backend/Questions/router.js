import { ok, redirect, notFound } from 'wix-router';
import { getProductQuestions, getQuestionAndReplies } from 'backend/Questions/query.web';
import { getUniqueBuyersCountForThisProduct } from 'backend/Helpers/product_helpers.web';

/**
 * @param {import('wix-router').WixRouterRequest} request 
 */
export async function questions_Router(request) {
    try {
        // Redirect to /account/questions if no question path provided
        if (request.path.length === 0) {
            return redirect("/account/questions", "301");
        }

        // Questions page requested by product slug
        if (request.path.length === 1) {
            const [productSlug] = request.path;
            const [d1, uniqueBuyersCount] = await Promise.all([
                getProductQuestions(productSlug, 0, 10),
                getUniqueBuyersCountForThisProduct(productSlug)
            ]);
            return ok("Questions", { ...d1, uniqueBuyersCount });
        }

        if (request.path.length === 2) {
            const [productSlug, questionId] = request.path;
            const warmupData = await getQuestionAndReplies(productSlug, questionId);
            return ok("Question", warmupData);
        }

        return notFound();
    } catch (err) {
        throw new Error(`Error while loading/rendering questions router: ${err}`);
    }
}

export async function questions_SiteMap(sitemapRequest) {
    return [];
}