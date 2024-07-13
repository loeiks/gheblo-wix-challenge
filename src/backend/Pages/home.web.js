import { getRecommendedProducts } from 'backend/Stores/recommended_products.web';
import { queryVideos } from 'backend/Explore/query_videos.web';
import { Permissions, webMethod } from 'wix-web-module';

export const getHomePageData = webMethod(Permissions.Anyone, async () => {
    try {
        const [recommendedProducts, videos] = await Promise.all([
            getRecommendedProducts(),
            queryVideos(1, null, 6)
        ]);

        return {
            recommendedProducts,
            videos
        };
    } catch (err) {
        throw new Error(`Error when getting home page data, ${err}`);
    }
});