import { webMethod, Permissions } from 'wix-web-module';
import weivData from '@exweiv/weiv-data';
import { recursivelyConvertIds } from '../Helpers/recursive_id_converter';
import { currentUser } from 'wix-users-backend';
import { checkIsInFavs } from 'backend/Products/favs.web.js';
import moment from 'moment';

export const searchInProducts = webMethod(Permissions.Anyone, async (searchPhrase, skip) => {
    try {
        const aggregationResult = await weivData.aggregate("Gheblo/WixStoresProducts").stage(
            {
                $search: {
                    index: "DynamicProductSearch",
                    text: {
                        query: searchPhrase,
                        path: ["entity.name", "entity.sku", "entity.slug", "entity.ribbon", "entity.numericId"],
                        fuzzy: {}
                    }
                }
            },
            {
                $addFields: {
                    score: { $meta: "searchScore" }
                }
            },
            {
                $facet: {
                    results: [
                        { $sort: { score: -1 } },
                        { $skip: skip || 0 },
                        { $limit: 12 },
                        {
                            $project: {
                                entity: 1,
                                score: 1
                            }
                        }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            },
            {
                $unwind: "$totalCount"
            },
            {
                $project: {
                    results: 1,
                    totalCount: "$totalCount.count"
                }
            }
        ).run({ suppressAuth: true });

        let searchResults = recursivelyConvertIds(aggregationResult.items[0].results).map(i => i.entity).map(async (item) => {
            if (currentUser.loggedIn) {
                const isInFavs = await checkIsInFavs(item._id);
                return {
                    ...item,
                    isInFavs
                }
            }

            return item;
        });

        searchResults = await Promise.all(searchResults);

        return {
            searchResults,
            totalCount: aggregationResult.items[0].totalCount
        };
    } catch (err) {
        throw new Error(`Error while searching in products: ${err}`);
    }
}, {
    cache: {
        tags: ["search-in-products"],
        ttl: 20
    }
});

function parseDateString(dateObject) {
    const dateStr = dateObject.$date;
    const date = moment(dateStr);
    if (date.isValid()) {
        return date.toDate();
    }
}