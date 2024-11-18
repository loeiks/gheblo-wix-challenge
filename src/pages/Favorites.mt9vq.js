// Wix API Imports
import { getRouterData } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import { remove } from 'lodash';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
// Backend Imports
import { removeProductFromFavs } from 'backend/Products/favs.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const myAccountStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });
}

// Setup Store Functions
const store = createStoreon([myAccountStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    const routerData = getRouterData();
    initPage(routerData);
    return readyStore();
});

async function initPage(routerData) {
    // Register State Events
    setupStateEvents();
    highLightCurrentTab();

    const {
        currentMemberHeaderData,
        favoriteProducts
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);

    setState({
        favoriteProductsResponse: favoriteProducts,
        favoriteProducts: favoriteProducts.items
    });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("favoriteProducts", ({ favoriteProducts }) => {
        if (favoriteProducts) {
            if (favoriteProducts.length > 0) {
                setState({ noFavorites: false });
                $w('#favoritesRepeater').data = [];
                $w('#favoritesRepeater').data = favoriteProducts;
            } else {
                setState({ noFavorites: true });
            }
        } else {
            setState({ noFavorites: true });
        }
    });

    connect("noFavorites", ({ noFavorites }) => {
        if (noFavorites === true) {
            $w('#favoritesRepeater').collapse();
            $w('#noFavoritesText').expand();
        } else {
            $w('#noFavoritesText').collapse();
            $w('#favoritesRepeater').expand();
        }
    });
}

function setEventListeners() {
    $w('#favoritesRepeater').onItemReady(($item, itemData, index) => {
        const { mainMedia, name, formattedDiscountedPrice, productPageUrl } = itemData.product[0].entity;

        $item('#productImage').src = mainMedia;
        $item('#productImage').link = `https://exweiv.wixstudio.io/gheblo${productPageUrl}`;
        $item('#productImage').target = "_blank";
        $item('#productImage').tooltip = `Click to see ${name} in new tab`;

        $item('#productName').text = name;
        $item('#productPrice').text = formattedDiscountedPrice;
    });

    $w('#favoriteButton').onClick(async (event) => {
        const { itemData, $item, data } = useScope(event);

        $item('#favoriteButton').disable();
        const response = await removeProductFromFavs(itemData.product[0].entity._id);
        $item('#favoriteButton').enable();

        if (response) {
            remove(data, obj => obj._id === itemData._id);
            setState({ favoriteProducts: data });
            dispatch("notify", { message: "Product removed from your favorites.", type: "success" });
        } else {
            dispatch("notify", { message: "You couldn't remove product from your favorites!", type: "error" });
        }
    });

    $w('#productName').onMouseIn((event) => {
        const { $item } = useScope(event);
        $item('#productName').customClassList.add("text-underline");
    });

    $w('#productName').onMouseOut((event) => {
        const { $item } = useScope(event);
        $item('#productName').customClassList.remove("text-underline");
    });

    $w('#productName').onClick((event) => {
        const { itemData, } = useScope(event);
        to(`https://exweiv.wixstudio.io/gheblo${itemData.product[0].entity.productPageUrl}`);
    });
}