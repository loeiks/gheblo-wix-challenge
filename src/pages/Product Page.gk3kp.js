// Import Velo/Wix APIs
import { path, query } from 'wix-location-frontend';
import { prefetchPageResources } from 'wix-site-frontend';
import { authentication } from 'wix-members-frontend';
import { formFactor } from 'wix-window-frontend';
// Import NPM Packages
import { createStoreon } from 'storeon-velo';
// Import Backend Functions
import { getGenAIResponse } from 'backend/AI/ai_chat.web';
import { getProductPageData } from 'backend/Pages/productPage.web';
import { checkIsInFavs } from 'backend/Products/favs.web';
// Import View Renderers
import { renderDesktopView, setupDesktopStateEvents } from 'public/ProductPage/desktop.js';
import { renderMobileView, setupMobileStateEvents } from 'public/ProductPage/mobile.js';
import { renderAiChat, setupAIStateEvents } from 'public/ProductPage/aiChat.js';
import { renderDiscussions, setupDiscussionsStateEvents } from 'public/ProductPage/discussions';
import { renderReviews, setupReviewsStateEvents } from 'public/ProductPage/reviews';
// Import Helpers
import { showNotifier } from 'public/notifier';
import { ssRedering } from 'public/Helpers/ssr';

// Icon URLs
const expandedIcon = "https://static.wixstatic.com/media/510eca_3eea9158450d428aaa75dc0bda96705a~mv2.png";
const collapsedIcon = "https://static.wixstatic.com/media/510eca_f91276b978324371ae93076204f63e7d~mv2.png";
const inFavsIcon = "https://static.wixstatic.com/shapes/510eca_533c8b3ec0e14523b415e74e8fa63768.svg";

// Define Product Store
const productDataStore = (store) => {
    store.on('@init', () => ({
        _currentChoices: {},
        _pageIcons: { collapsedIcon, expandedIcon, inFavsIcon },
        _aiChatHistory: []
    }));

    store.on("@changed", (state, changes) => {
        if (query["dev"]) {
            console.log(changes);
        }
    });

    // Save state change event listeners based on formFactor to save memory and prevent useless updates and conflicts
    if (formFactor === ("Desktop" || "Tablet")) {
        store.on("setupDesktopStateEvents", setupDesktopStateEvents);
        store.on("renderDesktopView", renderDesktopView);
    } else {
        store.on("setupMobileStateEvents", setupMobileStateEvents);
        store.on("renderMobileView", renderMobileView);
    }

    // Notifier function in state manager
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    // Renders AI chat agent UI
    store.on("setupAIStateEvents", setupAIStateEvents);
    store.on("renderAiChat", renderAiChat);

    // Renders discussions section
    store.on("renderDiscussions", renderDiscussions);
    store.on("setupDiscussionsStateEvents", setupDiscussionsStateEvents);

    // Renders reviews section/s
    store.on("renderReviews", renderReviews);
    store.on("setupReviewsStateEvents", setupReviewsStateEvents);

    store.on("getPromptResponse", async ({ _aiProductData }, prompt) => {
        // Disable chat input and wait for new response (input enabled on connect)
        $w('#aiPromptInput').disable();
        const response = await getGenAIResponse(prompt, _aiProductData, $w('#aiChatRepeater').data);
        store.set({ _aiResponse: response });
    });

    store.on("showLoginScreen", () => {
        authentication.promptLogin({ modal: true, mode: "login" });
    });
};

// Create State
const appState = createStoreon([productDataStore]);
const { getState, setState, dispatch, connect, readyStore } = appState;

$w.onReady(async function () {
    // Load required data with SSR
    const {
        productData,
        suggestedPrompts,
        productDiscussions,
        productReviews
    } = await ssRedering("productPageData", getProductPageDetails);
    const favStatus = await ssRedering("favStatus", checkProductFavStatus);

    initPage({
        productData,
        favStatus,
        suggestedPrompts,
        productDiscussions,
        productReviews
    });

    // Load lightboxes when page loads
    prefetchPageResources({ lightboxes: ["ProductImagePreview", "MobileColorSelection", "ReviewsPhotosExplore"] });
    return readyStore();
});

async function initPage({ productData, favStatus, suggestedPrompts, productDiscussions, productReviews }) {
    // Reset all repeaters data to empty array to avoid conflicts etc.
    $w('Repeater').data = [];
    $w('#aiHelperBox').delete();

    // Setup State Events (these events needs to run first because they should react to changes to the state)
    setupStateEvents();

    // Save data to states and fire connection state event updates via storeon
    setState({ ...productData, _aiProductData: productData });
    setState({ _isProductInFavs: favStatus });
    setState({ _productReviews: productReviews.items });
    setState({ _productRatings: productReviews.ratings });
    setState({ _productDiscussions: productDiscussions });
    setState({ _aiSuggestedPrompts: suggestedPrompts });

    // Render Views based on device
    if (formFactor === ("Desktop" || "Tablet")) {
        dispatch("renderDesktopView", appState);
    } else {
        dispatch("renderMobileView", appState);
    }

    // Render reviews
    dispatch("renderReviews", appState);

    // Render Discussions
    dispatch("renderDiscussions", appState);

    // Render AI Chat
    dispatch("renderAiChat", appState);
}

function setupStateEvents() {
    // Fire state event listeners (connections to storeon) based on formFactor (device type)
    if (formFactor === ("Desktop" || "Tablet")) {
        dispatch("setupDesktopStateEvents", appState);
    } else {
        dispatch("setupMobileStateEvents", appState);
    }

    // These are same for all devices
    dispatch("setupAIStateEvents", appState);
    dispatch("setupDiscussionsStateEvents", appState);
    dispatch("setupReviewsStateEvents", appState);
}

// HELPER FUNCTIONS
async function getProductPageDetails() {
    const slug = path[1];
    return await getProductPageData(slug);
}

async function checkProductFavStatus() {
    const isLoggedIn = authentication.loggedIn();

    if (isLoggedIn) {
        const response = await checkIsInFavs(getState()._id);
        return response;
    } else {
        return false;
    }
}