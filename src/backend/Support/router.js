import { ok, notFound } from 'wix-router';
import { getCurrentMemberData } from 'backend/Helpers/member_helpers';
import { getArticle } from './support_system.web';

/**
 * @param {import('wix-router').WixRouterRequest} request 
 */
export async function support_Router(request) {
    try {
        const articleSlug = request.path[1];
        const currentMemberData = await getCurrentMemberData();

        if (!articleSlug) {
            return ok("Support Home", { currentMemberData });
        }

        if (articleSlug) {
            const article = await getArticle(articleSlug);
            return ok("Support Article", { currentMemberData, article });
        }

        return notFound();
    } catch (err) {
        throw new Error(`Error while handling support route: ${err}`);
    }
}

export async function support_SiteMap(sitemapRequest) {
    return [];
}