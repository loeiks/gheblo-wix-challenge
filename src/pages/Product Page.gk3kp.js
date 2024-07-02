// Import Velo/Wix APIs
import { path, query } from 'wix-location-frontend';
import { prefetchPageResources } from 'wix-site-frontend';
import { authentication } from 'wix-members-frontend';
// Import NPM Packages
import { createStoreon } from 'storeon-velo';
// Import Backend Functions
import { getProductData } from 'backend/Products/helpers.web';
import { getGenAIResponse } from 'backend/AI/ai_chat.web';
import { checkIsInFavs } from 'backend/Products/favs.web';
import { getSuggestedPrompts } from 'backend/AI/ai_chat.web';
import { queryProductDiscussions } from 'backend/Discussions/discussions.web';
// Import View Renderers
import { renderDesktopView, setupDesktopStateEvents } from 'public/ProductPage/desktop.js';
import { renderMobileView, setupMobileStateEvents } from 'public/ProductPage/mobile.js';
import { renderAiChat, setupAIStateEvents } from 'public/ProductPage/aiChat.js';
import { renderDiscussions, setupDiscussionsStateEvents } from 'public/ProductPage/discussions';
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

    store.on("setupDesktopStateEvents", setupDesktopStateEvents);
    store.on("setupMobileStateEvents", setupMobileStateEvents);

    store.on("renderDesktopView", renderDesktopView);
    store.on("renderMobileView", renderMobileView);

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

    store.on("getPromptResponse", async ({ _aiProductData }, prompt) => {
        // Disable chat input and wait for new response (input enabled on connect)
        $w('#aiPromptInput').disable();
        const response = await getGenAIResponse(prompt, _aiProductData, $w('#aiChatRepeater').data);
        store.set({ _aiResponse: response });
    });

    store.on("showLoginScreen", () => {
        authentication.promptLogin({ modal: true, mode: "login" });
    })
};

// Create State
const appState = createStoreon([productDataStore]);
const { getState, setState, dispatch, connect, readyStore } = appState;

$w.onReady(async function () {
    prefetchPageResources({ lightboxes: ["ProductImagePreview", "MobileColorSelection"] });

    // Load required data with SSR
    const [productData, favStatus, suggestedPrompts, productDiscussions] = await Promise.all([
        ssRedering("productData", getProductDataBySlug),
        ssRedering("favStatus", checkProductFavStatus),
        ssRedering("suggestedPrompts", getSuggestedPrompts),
        ssRedering("productDiscussions", getProductDiscussions)
    ]);

    initPage({
        productData,
        favStatus,
        suggestedPrompts,
        productDiscussions
    });
    return readyStore();
});

async function initPage({ productData, favStatus, suggestedPrompts, productDiscussions }) {
    $w('#aiHelperBox').delete();

    // Setup State Events (these events needs to run first because they should react to changes to the state)
    setupStateEvents();

    setState({ ...productData, _aiProductData: productData });
    setState({ _isProductInFavs: favStatus });
    setState({ _aiSuggestedPrompts: suggestedPrompts });
    setState({ _productDiscussions: productDiscussions });

    // Render Both Views
    dispatch("renderDesktopView", appState);
    dispatch("renderMobileView", appState);

    // Render AI Chat
    dispatch("renderAiChat", appState);

    // Render Discussions
    dispatch("renderDiscussions", appState);
}

function setupStateEvents() {
    dispatch("setupDesktopStateEvents", appState);
    dispatch("setupMobileStateEvents", appState);
    dispatch("setupAIStateEvents", appState);
    dispatch("setupDiscussionsStateEvents", appState);
}

// HELPER FUNCTIONS
async function checkProductFavStatus() {
    const isLoggedIn = authentication.loggedIn();

    if (isLoggedIn) {
        const response = await checkIsInFavs(getState()._id);
        return response;
    } else {
        return false;
    }
}

async function getProductDataBySlug() {
    const slug = path[1];
    const productData = await getProductData(slug);
    return productData;
}

async function getProductDiscussions() {
    const slug = path[1];
    return await queryProductDiscussions(slug);
}