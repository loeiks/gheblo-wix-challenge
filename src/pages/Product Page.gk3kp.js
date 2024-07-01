// Import Velo/Wix APIs
import { path } from 'wix-location-frontend';
import { formFactor, openLightbox } from 'wix-window-frontend';
import { prefetchPageResources } from 'wix-site-frontend';
import { cart } from 'wix-stores-frontend';
// Import NPM Packages
import { v4 as uuidv4 } from 'uuid';
import { createStoreon } from 'storeon-velo';
// Import Backend Functions
import { getProductData } from 'backend/Products/helpers.web.js';
// Import View Renderers
import { renderDesktopView, setupDesktopStateEvents } from 'public/ProductPage/desktop.js';
import { renderMobileView, setupMobileStateEvents } from 'public/ProductPage/mobile.js';

// Icon URLs
const expandedIcon = "https://static.wixstatic.com/media/510eca_3eea9158450d428aaa75dc0bda96705a~mv2.png";
const collapsedIcon = "https://static.wixstatic.com/media/510eca_f91276b978324371ae93076204f63e7d~mv2.png";

// Define Product Store
const productDataStore = (store) => {
    store.on('@init', () => ({ _currentChoices: {}, _pageIcons: { collapsedIcon, expandedIcon } }));

    store.on("setupDesktopStateEvents", setupDesktopStateEvents);
    store.on("setupMobileStateEvents", setupMobileStateEvents);

    store.on("renderDesktopView", renderDesktopView);
    store.on("renderMobileView", renderMobileView);
};

// Create State
const appState = createStoreon([productDataStore]);
const { getState, setState, dispatch, connect, readyStore } = appState;

$w.onReady(function () {
    prefetchPageResources({ lightboxes: ["ProductImagePreview", "MobileColorSelection"] });
    initPage();
    return readyStore();
});

async function initPage() {
    // Setup State Events
    setupStateEvents();

    // Get product data and save it to page state
    const slug = path[1];
    setState({ ...await getProductData(slug) });

    // Render Both Views
    dispatch("renderDesktopView", appState);
    dispatch("renderMobileView", appState);

    // if (formFactor === ("Desktop" || "Tablet")) {
    //     // Render for Desktop
    //     dispatch("renderDesktopView", appState);
    // } else {
    //     // Render for Mobile
    //     dispatch("renderMobileView", appState);
    // }
}

function setupStateEvents() {
    dispatch("setupDesktopStateEvents", appState);
    dispatch("setupMobileStateEvents", appState);
}