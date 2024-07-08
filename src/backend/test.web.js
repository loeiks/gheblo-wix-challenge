import weivData from '@exweiv/weiv-data';
import { Permissions, webMethod } from 'wix-web-module';

export const textFunc = webMethod(Permissions.Anyone, async (query) => {
    return await weivData.aggregate("Gheblo/Questions").stage(...[
        {
            $search: {
                index: "QuestionSearches",
                text: {
                    query,
                    path: ["text"],
                    fuzzy: {}
                }
            }
        },
        {
            $addFields: {
                "score": { $meta: 'searchScore' }
            }
        },
        {
            $sort: {
                "score": 1
            }
        }
    ]).run({ suppressAuth: true });
})