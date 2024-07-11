// Import Velo/Wix APIs
import { path, query, onChange, url, to } from 'wix-location-frontend';
import { prefetchPageResources } from 'wix-site-frontend';
import { authentication } from 'wix-members-frontend';
import { formFactor } from 'wix-window-frontend';
// Import NPM Packages
import { createStoreon } from 'storeon-velo';
import { v4 as uuidv4 } from 'uuid';
import { initial } from 'lodash';
// Import Backend Functions
import { getGenAIResponse } from 'backend/AI/ai_chat.web';
import { getProductPageData } from 'backend/Pages/productPage.web';
// Import View Renderers
import { renderDesktopView, setupDesktopStateEvents } from 'public/ProductPage/desktop.js';
import { renderMobileView, setupMobileStateEvents } from 'public/ProductPage/mobile.js';
import { renderAiChat, setupAIStateEvents } from 'public/ProductPage/aiChat.js';
import { renderQuestions, setupQuestionsStateEvents } from 'public/ProductPage/questions';
import { renderReviews, setupReviewsStateEvents } from 'public/ProductPage/reviews';
// Import Helpers
import { showNotifier } from 'public/notifier';
import { ssRedering } from 'public/Helpers/ssr';

// Icon URLs
const expandedIcon = "https://static.wixstatic.com/media/510eca_3eea9158450d428aaa75dc0bda96705a~mv2.png";
const collapsedIcon = "https://static.wixstatic.com/media/510eca_f91276b978324371ae93076204f63e7d~mv2.png";
const inFavsIcon = "https://static.wixstatic.com/shapes/510eca_533c8b3ec0e14523b415e74e8fa63768.svg";
const favsIcon = "https://static.wixstatic.com/shapes/510eca_d7acda89cc2a49f99ac3269f3b77fa14.svg";

// Define Product Store
const productDataStore = (store) => {
    store.on('@init', () => ({
        _currentChoices: {},
        _pageIcons: { collapsedIcon, expandedIcon, inFavsIcon, favsIcon },
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

    // Renders questions section
    store.on("renderQuestions", renderQuestions);
    store.on("setupQuestionsStateEvents", setupQuestionsStateEvents);

    // Renders reviews section/s
    store.on("renderReviews", renderReviews);
    store.on("setupReviewsStateEvents", setupReviewsStateEvents);

    store.on("getPromptResponse", async ({ _aiProductData }, prompt) => {
        // Disable chat input and wait for new response (input enabled on connect)
        $w('#aiPromptInput').disable();

        const currentData = $w('#aiChatRepeater').data;
        $w('#aiChatRepeater').data = [
            ...currentData, {
                _id: uuidv4(),
                parts: [{ text: "_typing_lottie" }],
                role: "model"
            }
        ];

        const history = initial($w('#aiChatRepeater').data);

        console.log(history);

        const response = await getGenAIResponse(prompt, _aiProductData, history);
        store.set({ _aiResponse: response });
        $w('#aiPromptInput').enable();
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
        productQuestions,
        productReviews,
        isInFavorite,
        uniqueBuyersCount
    } = await ssRedering("productPageData", getProductPageDetails);

    initPage({
        productData,
        isInFavorite,
        suggestedPrompts,
        productQuestions,
        productReviews,
        uniqueBuyersCount
    });

    // Load lightboxes when page loads
    prefetchPageResources({ lightboxes: ["ProductImagePreview", "MobileColorSelection", "ReviewsPhotosExplore"] });
    return readyStore();
});

async function initPage({ productData, isInFavorite, suggestedPrompts, productQuestions, productReviews, uniqueBuyersCount }) {
    // Reset all repeaters data to empty array to avoid conflicts etc.
    $w('Repeater').data = [];
    await $w('#aiHelperBox').delete();

    // Setup State Events (these events needs to run first because they should react to changes to the state)
    setupStateEvents();

    // Save data to states and fire connection state event updates via storeon
    setState({ ...productData, _aiProductData: productData });
    setState({ _isProductInFavs: isInFavorite });
    setState({ _productReviews: productReviews.items });
    setState({ _productRatings: productReviews.ratings });
    setState({ _totalProductReviews: productReviews.totalReviews });
    setState({ _productQuestions: productQuestions });
    setState({ _uniqueBuyersCount: uniqueBuyersCount });
    setState({ _aiSuggestedPrompts: suggestedPrompts });

    // Render Views based on device
    if (formFactor === ("Desktop" || "Tablet")) {
        dispatch("renderDesktopView", appState);
    } else {
        dispatch("renderMobileView", appState);
    }

    // Render reviews
    dispatch("renderReviews", appState);

    // Render Questions
    dispatch("renderQuestions", appState);

    // Render AI Chat
    dispatch("renderAiChat", appState);

    const { name, slug } = getState();
    $w('#breadcrumbs').items = [
        {
            label: 'Home',
            link: '/'
        },
        {
            label: 'Category',
            link: `/category/all-products/`
        },
        {
            label: name,
            link: `/product-page/${slug}/`,
            isCurrent: true
        }
    ]

    onChange(() => {
        to(url);
    })
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
    dispatch("setupQuestionsStateEvents", appState);
    dispatch("setupReviewsStateEvents", appState);
}

// HELPER FUNCTIONS
async function getProductPageDetails() {
    const slug = path[1];
    return await getProductPageData(slug);
}