import { formFactor } from 'wix-window-frontend';

export function setupHeader(memberEComData) {
    const { profileData, totalOrders, totalProductFavorites, totalProductReviews } = memberEComData;
    const { profile } = profileData;

    if (formFactor === "Desktop") {
        $w('#profilePicture').src = profile.profilePhoto.url;
        $w('#memberName').text = `Hello, ${profile.nickname}`;

        $w('#memberTotalOrdersText').text = `${totalOrders}`;
        $w('#memberTotalFavoritesText').text = `${totalProductFavorites}`;
        $w('#memberTotalReviewsText').text = `${totalProductReviews}`;
    }

    return null;
}