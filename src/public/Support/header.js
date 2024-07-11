import { authentication } from "wix-members-frontend";
import { path, to } from "wix-location-frontend";
import { formFactor } from "wix-window-frontend";

export function handleSupportHeader(pageTitle) {
    handleIcons();

    if (!pageTitle) {
        $w('#supportBreadcrumbs').items = [
            {
                label: "Support Center",
                link: "/support",
                isCurrent: true
            }
        ]
    } else {
        const articleSlug = path[1];
        $w('#supportBreadcrumbs').items = [
            {
                label: "Support Center",
                link: "/support"
            },
            {
                label: pageTitle,
                link: `/support/article/${articleSlug}`,
                isCurrent: true
            }
        ]
    }

    $w('#supportSearchInputHeader').onChange((event) => {
        navigateToSearch();
    });

    $w('#searchIconBtnSupport').onClick(() => {
        navigateToSearch();
    })

    $w('#supportSearchInputHeader').onKeyPress((event) => {
        if (event.key === "Enter") {
            navigateToSearch();
        }
    });
}

function handleIcons() {
    if (authentication.loggedIn()) {
        $w('#supportLoginBar').expand();
        $w('#loginIconSupport').collapse();
        handleSearchInput("header-search-logged-in", "header-search-icon-logged-in")
    } else {
        $w('#supportLoginBar').collapse();
        $w('#loginIconSupport').expand();
        handleSearchInput("header-search", "header-search-icon");

        $w("#loginIconSupport").onClick(() => {
            authentication.promptLogin({ mode: "login" });
        });
    }
}

function handleSearchInput(className1, className2) {
    if (formFactor === "Desktop") {
        $w('#supportSearchInputHeader').customClassList.add(className1);
        $w('#searchIconBtnSupport').customClassList.add(className2);
    }
}

function navigateToSearch() {
    const value = $w('#supportSearchInputHeader').value;
    if (value.length > 0) {
        to(`/support?search=${value}`);
    }
}