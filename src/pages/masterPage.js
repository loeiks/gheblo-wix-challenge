import { cart } from "wix-stores-frontend";
import { authentication } from "wix-members-frontend";
import { formFactor, openLightbox } from "wix-window-frontend";
import { to, prefix } from "wix-location-frontend";

$w.onReady(function () {
    const unTouchPages = [
        "explore",
        "checkout"
    ];

    if (unTouchPages.includes(prefix) !== true) {
        initClusters();
    }
});

// Global functions are always called as Clusters to be notified in Clusters IST 1-2
async function initClusters() {
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

function eventListeners() {
    $w("#shoppingCart").onClick(() => {
        if (formFactor != "Mobile") {
            cart.showMiniCart();
        } else {
            to("/cart-page");
        }
    });

    $w("#searchIcon").onClick(() => {
        openLightbox("Search Box");
    });

    $w('#startChat').onClick(() => {
        $w('#wixChat').maximize();
    })
}