import { ok, notFound } from 'wix-router';
import { searchInProducts } from './search_products.web';

/**
 * @param {import('wix-router').WixRouterRequest} request 
 */
export async function search_Router(request) {
    try {
        const query = request.query?.q;

        if (!query) {
            return notFound();
        }

        const searchResults = await searchInProducts(query);
        return ok("Search Results", searchResults);
    } catch (err) {
        throw new Error(`Error while loading/rendering search router: ${err}`);
    }
}

export async function search_SiteMap(sitemapRequest) {
    return [];
}