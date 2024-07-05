import { ok, sendStatus, redirect, notFound, forbidden } from 'wix-router';
import { getCurrentMemberEComData } from 'backend/Members/member_data.web.js';
import { getRecentOrdersOfCurrentMember } from './header.web';
import { getCurrentMemberFavoriteProducts } from './favorites.web';
import { getCurrentMemberVideos } from './videos.web';
import { queryAllProductsCurrentMemberHasntReviewed, queryAllReviewsOfCurrentMember } from './reviews.web';
import { getCurrentMemberOrders } from './orders.web';

const pagesByPath = {
    account: "My Account",
    favorites: "Favorites",
    videos: "Videos",
    reviews: "Reviews",
    orders: "Orders"
}

export async function account_Router(request) {
    try {
        if (request.user.role === "Visitor") {
            return forbidden();
        }

        const path = request.path[0];
        const currentMemberHeaderData = await getCurrentMemberEComData();
        const routerData = { currentMemberHeaderData };

        switch (path) {
            case "favorites": {
                routerData.favoriteProducts = await getCurrentMemberFavoriteProducts();
                break;
            }
            case "videos": {
                routerData.memberVideos = await getCurrentMemberVideos();
                break;
            }
            case "reviews": {
                routerData.reviewThemProducts = await queryAllProductsCurrentMemberHasntReviewed();
                routerData.reviews = await queryAllReviewsOfCurrentMember();
                break;
            }
            case "orders": {
                routerData.orders = await getCurrentMemberOrders();
                break;
            }
            default: {
                routerData.recentOrdersOfCurrentMember = await getRecentOrdersOfCurrentMember();
                break;
            }
        }

        if (!path) {
            return ok("My Account", routerData);
        } else {
            if (pagesByPath[path]) {
                return ok(pagesByPath[path], routerData);
            } else {
                return notFound();
            }
        }
    } catch (err) {
        throw new Error(`Error while loading/rendering member account router page: ${err}`);
    }
}

export async function account_SiteMap(sitemapRequest) {
    try {
        return [];
    } catch (err) {
        throw new Error(`Error while rendering member account pages sitemap: ${err}`);
    }
}