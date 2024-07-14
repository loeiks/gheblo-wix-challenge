import { prefix, path } from 'wix-location-frontend';
import { prefetchPageResources } from 'wix-site-frontend';

const pagesByPath = {
    account: "My Account",
    favorites: "Favorites",
    videos: "Videos",
    reviews: "Reviews",
    orders: "Orders",
    questions: "Questions"
}

export function highLightCurrentTab() {
    preloadPages();

    if ($w('#memberPagesMenu').rendered) {
        if (prefix === "account") {
            let currentTab = pagesByPath[prefix];

            if (path[0]) {
                currentTab = pagesByPath[path];
            }

            $w('#mobilePageTitle').text = currentTab;

            const updatedMenuItems = $w('#memberPagesMenu').menuItems.map((item) => {
                if (item.label === currentTab) {
                    return {
                        ...item,
                        selected: true
                    }
                } else {
                    return item;
                }
            });

            $w('#memberPagesMenu').menuItems = updatedMenuItems;
        }
    }
}

function preloadPages() {
    let allPages = [];

    for (const [index, slug] of Object.entries(pagesByPath)) {
        if (slug === "account" || slug === path[0]) return null;
        allPages.push(`https://www.gheblo.com/account/${slug}`);
    }

    prefetchPageResources({
        pages: allPages
    })
}