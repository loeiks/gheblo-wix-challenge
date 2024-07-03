import { webMethod, Permissions } from "wix-web-module";
import { getProductData } from 'backend/Products/helpers.web';
import { getSuggestedPrompts } from 'backend/AI/ai_chat.web';
import { queryProductDiscussions } from 'backend/Discussions/discussions.web';
import { queryReviews } from 'backend/Reviews/reviews.web';

export const getProductPageData = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        const start = new Date().getTime();

        const productData = await getProductData(productSlug);
        const calls = await Promise.all([
            getSuggestedPrompts(),
            queryProductDiscussions(productSlug),
            queryReviews(productSlug, 25, 0, true),
        ])

        console.log(`SSR took ${new Date().getTime() - start}ms`);

        return {
            productData,
            suggestedPrompts: calls[0],
            productDiscussions: calls[1],
            productReviews: calls[2]
        }
    } catch (err) {
        throw new Error(`Errow while loading product page data: ${err}`);
    }
}, {
    cache: {
        tags: ["comb-product-page-data"],
        ttl: 600 // cache for 10 min
    }
})