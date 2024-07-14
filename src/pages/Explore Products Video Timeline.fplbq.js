import { getRouterData } from 'wix-window-frontend';
import { createStoreon } from 'storeon-velo';
import { query, to } from 'wix-location-frontend';
import { authentication } from 'wix-members-frontend';
import { setTitle } from 'wix-seo-frontend';
// Import View Renderers
import { renderFeed, setupFeedStateEvents } from 'public/Explore/feed';
// Public Imports
import { showNotifier } from 'public/notifier';
import _ from 'lodash';

const _likedVideoIcon = "https://static.wixstatic.com/shapes/510eca_533c8b3ec0e14523b415e74e8fa63768.svg";
const _mutedIcon = "https://static.wixstatic.com/shapes/510eca_414bd1e2b99f4e6bb6a5ac0a4ef0c321.svg";
const _unmutedIcon = "https://static.wixstatic.com/shapes/510eca_8efcfd3eeb31473f83894a3fe53b06db.svg";
const _pauseIcon = "https://static.wixstatic.com/shapes/510eca_41613c02176e4b03aadc7171734c6f89.svg";
const _playIcon = "https://static.wixstatic.com/shapes/510eca_6a124eb45e064ba0b6241d8fd5cdb0bc.svg";
const _inFavsIcon = "https://static.wixstatic.com/shapes/510eca_533c8b3ec0e14523b415e74e8fa63768.svg";
const _favIcon = "https://static.wixstatic.com/shapes/510eca_d7acda89cc2a49f99ac3269f3b77fa14.svg";

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const exploreFeedStore = (store) => {
    store.on("@init", () => ({
        icons: {
            _likedVideoIcon,
            _mutedIcon,
            _unmutedIcon,
            _pauseIcon,
            _playIcon,
            _inFavsIcon,
            _favIcon
        },
        _loggedIn: authentication.loggedIn(),
        _productFavs: []
    }));

    // Log state changes to console for debugging when dev is enabled
    store.on("@changed", (state, changes) => {
        if (query["dev"]) {
            console.log(changes);
        }
    })

    // Renders Feed and State Events
    store.on("renderFeed", renderFeed);
    store.on("setupFeedStateEvents", setupFeedStateEvents);

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    store.on("handleFavButtonStatus", ({ _isProductInFavs, icons, _productFavs }, { targetButton, productId }) => {
        if (_isProductInFavs) {
            targetButton.icon = icons._inFavsIcon;
            targetButton.customClassList.add("in-favs");
            store.set({ _productFavs: [..._productFavs, productId] });
        } else {
            targetButton.customClassList.remove("in-favs");
            targetButton.icon = icons._favIcon;
            const newFavs = _.without(_productFavs, productId);
            store.set({ _productFavs: newFavs });
        }
    });
}

const exploreFeedStatsStore = (store) => {
    store.on("@init", () => ({
        _memberVideoStats: [],
        _memberVideoStatsProductATC: []
    }));

    // Log state changes to console for debugging when dev is enabled
    store.on("@changed", (state, changes) => {
        if (query["dev"]) {
            console.log(changes);
        }
    })
}

// Setup Store Functions
const store = createStoreon([exploreFeedStore, exploreFeedStatsStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    setTitle("Explore Feed | Gheblo");
    initPage();
    return readyStore();
});

async function initPage() {
    // Set State Events as Ready
    setupStateEvents();

    // Clear Repeater Data for All Repeater Items
    $w('Repeater').data = [];
    // Start videos muted.
    $w('#videoPlayer').mute();

    // Update State with Feed Page Data
    const feedData = await getRouterData();
    setState({ ...feedData });

    // Render Views
    renderViews();
}

function renderViews() {
    dispatch("renderFeed", store);
}

function setupStateEvents() {
    dispatch("setupFeedStateEvents", store);
}