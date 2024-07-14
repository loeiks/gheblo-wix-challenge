import { prefix, path } from 'wix-location-frontend';

const pagesByPath = {
    account: "My Account",
    favorites: "Favorites",
    videos: "Videos",
    reviews: "Reviews",
    orders: "Orders",
    questions: "Questions"
}

export function highLightCurrentTab() {
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