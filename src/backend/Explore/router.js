import { ok, redirect, WixRouterSitemapEntry } from 'wix-router';
import { queryVideos, getVideo } from 'backend/Explore/query_videos.web';
import { currentUser } from 'wix-users-backend'
import { queryProductFavs } from 'backend/Products/favs.web';
import weivData from '@exweiv/weiv-data';

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
        const { items, skipCount, totalVideos } = await queryVideos(0, videoId);

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
            _productFavs: memberProductFavs,
            totalVideos
        });
    } catch (err) {
        throw new Error(`Error while loading/rendering explore page: ${err}`);
    }
}

export async function explore_SiteMap(sitemapRequest) {
    try {
        const { items } = await weivData.query("Gheblo/Videos").limit(100).find({ suppressAuth: true, suppressHooks: true });

        const sitemapEntries = items.map((video) => {
            const entry = new WixRouterSitemapEntry();
            entry.title = video.title;
            entry.changeFrequency = "daily";
            entry.pageName = `${video.title} | Gheblo Explore`;
            entry.lastModified = video._updatedDate;
            entry.url = `https://www.gheblo.com/explore/${video._id}`;
            return entry;
        });

        const homePage = new WixRouterSitemapEntry();
        homePage.title = "Explore Feed | Gheblo";
        homePage.url = "https://www.gheblo.com/explore";

        return [...sitemapEntries, homePage];
    } catch (err) {
        throw new Error(`Error while rendering explore pages sitemap: ${err}`);
    }
}