import { formFactor } from 'wix-window-frontend';
import { _icons_ } from '../icons';

export function setupHeader(memberEComData) {
    const { profileData, totalOrders, totalProductFavorites, totalProductReviews } = memberEComData;
    const { profile } = profileData;

    if (formFactor === "Desktop") {
        $w('#profilePicture').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $w('#memberName').text = `Hello, ${profile.nickname}`;

        $w('#memberTotalOrdersText').text = `${totalOrders || 0}`;
        $w('#memberTotalFavoritesText').text = `${totalProductFavorites || 0}`;
        $w('#memberTotalReviewsText').text = `${totalProductReviews || 0}`;
    }

    return null;
}