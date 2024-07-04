import { ok, sendStatus, redirect, notFound, forbidden } from 'wix-router';
import { queryVideos, getVideo } from 'backend/Explore/query_videos.web';
import { currentUser } from 'wix-users-backend'
import { queryProductFavs } from 'backend/Products/favs.web';

export async function explore_Router(request) {
    try {
        if (request.path.length > 2) {
            return redirect("/explore", "302");
        }

        // Optional video id
        const videoId = request.path[0];

        let specificVideo;
        if (videoId) {
            // Start query with this video and then add 15 more videos
            specificVideo = await getVideo(videoId);
        }

        // Query videos and exclude specific video id
        const { items, skipCount } = await queryVideos(0, videoId);

        let feedVideos = items;
        if (specificVideo) {
            feedVideos = [specificVideo, ...items];
        }

        let memberProductFavs = [];
        if (currentUser.loggedIn) {
            memberProductFavs = await queryProductFavs();
            memberProductFavs = memberProductFavs.map(i => i.productId);
        }

        return ok("Explore Products Video Timeline", {
            feedVideos,
            skipCount,
            _productFavs: memberProductFavs
        });
    } catch (err) {
        throw new Error(`Error while loading/rendering explore page: ${err}`);
    }
}

export async function explore_SiteMap(sitemapRequest) {
    try {
        return [];
    } catch (err) {
        throw new Error(`Error while rendering explore pages sitemap: ${err}`);
    }
}