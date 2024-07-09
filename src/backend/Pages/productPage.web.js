import { webMethod, Permissions } from "wix-web-module";
import { getProductData } from 'backend/Products/helpers.web';
import { getSuggestedPrompts } from 'backend/AI/ai_chat.web';
import { getProductQuestions } from 'backend/Questions/query.web';
import { queryReviews } from 'backend/Reviews/reviews.web';
import { checkIsInFavs } from 'backend/Products/favs.web';
import { getUniqueBuyersCountForThisProduct } from "backend/Helpers/product_helpers.web.js";

export const getProductPageData = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        const start = new Date().getTime();

        const productData = await getProductData(productSlug);
        const calls = await Promise.all([
            getSuggestedPrompts(productSlug),
            getProductQuestions(productSlug, 0, 10),
            queryReviews(productSlug, 25, 0, true),
            checkIsInFavs(productData._id)
        ]);

        const uniqueBuyersCount = await getUniqueBuyersCountForThisProduct(productSlug);

        console.log(`SSR took ${new Date().getTime() - start}ms`);
        return {
            productData,
            suggestedPrompts: calls[0],
            productQuestions: calls[1],
            productReviews: calls[2],
            isInFavorite: calls[3],
            uniqueBuyersCount
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