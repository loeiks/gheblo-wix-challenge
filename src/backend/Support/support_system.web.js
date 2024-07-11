import weivData from '@exweiv/weiv-data';
import { webMethod, Permissions } from 'wix-web-module'
import { recursivelyConvertIds } from '../Helpers/recursive_id_converter';

export const getArticle = webMethod(Permissions.Anyone, async (postSlug) => {
    try {
        const article = await (await weivData.native("Gheblo/SupportArticles", true)).findOne({ slug: postSlug });
        return article;
    } catch (err) {
        throw new Error(`Error while fetching article: ${err}`);
    }
});

export const searchInSupportArticles = webMethod(Permissions.Anyone, async (query, customlimit) => {
    try {
        const aggregationResult = await weivData.aggregate("Gheblo/SupportArticles").stage(
            {
                $search: {
                    index: "SupportSearchIndex",
                    text: {
                        query,
                        path: ["title", "richContent", "excerpt", "slug", "plainContent"],
                        fuzzy: {}
                    }
                }
            },
            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },
            { $sort: { score: -1 } },
            { $limit: customlimit || 8 }
        ).run({ suppressAuth: true });

        return recursivelyConvertIds(aggregationResult.items);
    } catch (err) {
        throw new Error(`Error while searching in support articles: ${err}`);
    }
}, {
    cache: {
        tags: ["support-articles-search"],
        ttl: 1800
    }
});