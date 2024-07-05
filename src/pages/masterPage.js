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
    if ($w('#Header').rendered) {
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
            if (formFactor != "Mobile") {
                cart.showMiniCart();
            } else {
                to("/cart-page");
            }
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
        });
    }
}