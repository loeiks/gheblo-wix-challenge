import { getHomePageData } from 'backend/Pages/home.web';
import { createStoreon } from 'storeon-velo';
import { calculateDiscountPercentage } from 'public/ProductPage/helpers';
import { query, to } from 'wix-location-frontend';
import { _icons_ } from 'public/icons';
import { useScope } from 'repeater-scope';
import { authentication } from 'wix-members-frontend';

const homeStore = (store) => {
    store.on("@init", () => ({}));

    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });
}

const store = createStoreon([homeStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(async function () {
    const pageData = await getHomePageData();
    initPage(pageData);
    return readyStore();
});

async function initPage({ recommendedProducts, videos }) {
    setupStateEvents();
    setState({ recommendedProducts, videos: videos.items });
}

function setupStateEvents() {
    setEventListeners();

    connect("recommendedProducts", ({ recommendedProducts }) => {
        if (!recommendedProducts) return null;

        $w('#productsRepeater').data = [];
        $w('#productsRepeater').data = recommendedProducts;
    });

    connect("videos", ({ videos }) => {
        if (!videos) return null;

        $w('#videosRepeater').data = [];
        $w('#videosRepeater').data = videos;
    })
}

function setEventListeners() {
    $w('#productsRepeater').onItemReady(($item, itemData, index) => {
        $item('#productName').text = itemData.name;
        $item('#productDiscountedPrice').text = itemData.formattedDiscountedPrice;

        if (itemData.price !== itemData.discountedPrice) {
            const discountPercentage = calculateDiscountPercentage(itemData.price, itemData.discountedPrice);
            $item('#productDiscountedPrice').text = `${itemData.formattedDiscountedPrice} -%${discountPercentage}`;
            $item('#productPrice').text = itemData.formattedPrice;
            $item('#productPrice').expand();
        } else {
            $item('#productDiscountedPrice').text = itemData.formattedDiscountedPrice;
            $item('#productPrice').collapse();
        }

        $item('#productImage').src = itemData.mainMedia;
        $item('#productImage').link = `https://exweiv.wixstudio.io/gheblo/product-page/${itemData.slug}/`;
        $item('#productImage').target = "_self";
    });

    $w('#videosRepeater').onItemReady(($item, itemData, index) => {
        $item('#videoTitle').text = itemData.title;
        $item('#videoPlayer').src = itemData.videoUrl;
        $item('#videoPlayer').poster = itemData.thumbnailUrl;
        $item('#videoOwnerProfilePhoto').src = itemData.memberProfileData[0].entity.profile.profilePhoto?.url || _icons_.profilePhotoNull;
    });

    $w('#videoItem').onClick((event) => {
        const { itemData } = useScope(event);
        to(`https://exweiv.wixstudio.io/gheblo/explore/${itemData._id}/`);
    });

    $w('#exploreVideosBox').onClick(() => {
        to("https://exweiv.wixstudio.io/gheblo/explore/");
    })

    $w('#becomeMemberText').onClick(() => {
        authentication.promptLogin({ mode: "signup" });
    })
}