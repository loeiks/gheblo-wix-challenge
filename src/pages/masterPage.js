import { authentication } from "wix-members-frontend";
import { openLightbox } from "wix-window-frontend";
import { to, prefix, url } from "wix-location-frontend";
import { prefetchPageResources } from 'wix-site-frontend';

$w.onReady(function () {
    const unTouchPages = [
        "checkout"
    ];

    if (unTouchPages.includes(prefix) !== true) {
        initClusters();
    }

    // Refresh page when user logs-in
    authentication.onLogin(() => to(url));
    prefetchPageResources({ lightboxes: ["CustomCart"] });
});

// Global functions are always called as Clusters to be notified in Clusters IST 1-2
async function initClusters() {
    if ($w('#header').rendered) {
        if (authentication.loggedIn() === true) {
            $w("#memberLoginBar").expand();
            $w("#membersLoginBarMobileMenu").expand();
        } else {
            $w("#loginIcon").expand();
            $w("#loginIcon").onClick(() => {
                authentication.promptLogin({ mode: "login" });
            })
        }

        eventListeners();
    }
}

function eventListeners() {
    if ($w("#shoppingCart").rendered) {
        $w("#shoppingCart").onClick(() => {
            openLightbox("CustomCart")
        });
    }

    if ($w("#searchIcon").rendered) {
        $w("#searchIcon").onClick(() => {
            openLightbox("Search Box");
        });
    }

    if ($w('#startChat').rendered) {
        $w('#startChat').onClick(() => {
            $w('#wixChatBox').maximize();
            $w('#wixChatBox').expand();
        });
    }
}