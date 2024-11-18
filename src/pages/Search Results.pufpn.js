import { createStoreon } from 'storeon-velo';
import { query, to } from 'wix-location-frontend';
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { calculateDiscountPercentage } from 'public/ProductPage/helpers';
import { searchInProducts } from 'backend/Search/search_products.web';
import { showNotifier } from 'public/notifier';
import { debounce } from 'lodash';
import { authentication } from 'wix-members-frontend';
import { useScope } from 'repeater-scope';
import { toggleFavoriteProduct } from 'backend/Products/favs.web.js';
import { _icons_ } from 'public/icons';
import { filterProducts, sortProducts } from 'public/Filters/filtering';

const searchStore = (store) => {
    store.on("@init", () => ({
        searchQuery: query["q"]
    }));

    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    store.on("loadMoreProducts", loadMore);
    store.on("updateResults", ({ sortOption, searchResults, filtersStatus, currentFilters }) => {
        let products = searchResults;
        if (filtersStatus) {
            products = filterProducts(currentFilters, searchResults);
        }

        products = sortProducts(sortOption, products);
        setState({ products });
    });
}

const store = createStoreon([searchStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(() => {
    initPage();
    return readyStore();
});

async function initPage() {
    setupStateEvents();
    const { searchResults, totalCount } = getRouterData();
    setState({ searchResults, totalCount });
}

function setupStateEvents() {
    setEventListeners();

    connect("searchQuery", ({ searchQuery }) => {
        if (!searchQuery) return null;
        $w('#searchInput').value = searchQuery;
    });

    connect("sortOption", () => { dispatch("updateResults"); });
    connect("searchResults", () => { dispatch("updateResults"); });
    connect("products", ({ products, totalCount }) => {
        if (!products) return null;

        if (products.length > 0) {
            $w('#productsRepeater').expand();
            $w('#noProductsText').collapse();
            $w('#productsRepeater').data = products;
            $w('#resultsTotal').text = `${totalCount} results in total.`;
        } else {
            $w('#productsRepeater').collapse();
            $w('#noProductsText').expand();
        }
    });

    connect("currentFilters", ({ currentFilters }) => {
        let hasFilter;
        if (currentFilters) {
            for (const [key, filter] of Object.entries(currentFilters)) {
                if (filter.length > 0 && !hasFilter) hasFilter = true;
            }
        }

        if (hasFilter) {
            setState({ filtersStatus: true });
            $w('#filterIcon').customClassList.add("has-filters");
        } else {
            setState({ filtersStatus: false });
            $w('#filterIcon').customClassList.remove("has-filters");
        }

        dispatch("updateResults");
    });

    connect("allProductsLoaded", ({ allProductsLoaded }) => {
        if (!allProductsLoaded) return null;
        $w('#allLoaded').expand();
    });
}

function setEventListeners() {
    $w('#productsRepeater').onItemReady(($item, itemData, index) => {
        $item('#productName').text = itemData.name;
        $item('#productDiscountedPrice').text = itemData.formattedDiscountedPrice;

        if (itemData.price !== itemData.discountedPrice) {
            const discountPercentage = calculateDiscountPercentage(itemData.price, itemData.discountedPrice);
            $item('#productDiscountedPrice').text = `${itemData.formattedDiscountedPrice} -%${discountPercentage}`;
            $item('#productPrice').text = itemData.formattedPrice;
            $item('#productPrice').expand();
        } else {
            $item('#productDiscountedPrice').text = itemData.formattedDiscountedPrice;
            $item('#productPrice').collapse();
        }

        if (itemData.isInFavs) {
            $item('#atfButton').customClassList.add("in-favs");
            $item('#atfButton').icon = _icons_.favoriteOn;
        } else {
            $item('#atfButton').customClassList.remove("in-favs");
            $item('#atfButton').icon = _icons_.favoriteOff;
        }

        $item('#productImage').src = itemData.mainMedia;
        $item('#productImage').link = `https://exweiv.wixstudio.io/gheblo/product-page/${itemData.slug}/`;
        $item('#productImage').target = "_self";
    });

    $w('#loadMoreLine').onViewportEnter(() => {
        const { totalCount, searchResults } = getState();
        if (searchResults < totalCount) {
            dispatch("loadMoreProducts");
        } else {
            setState({ allProductsLoaded: true });
        }
    });

    $w('#atfButton').onClick(async (event) => {
        if (!authentication.loggedIn()) {
            authentication.promptLogin();
            return null;
        }

        const { itemData, $item } = useScope(event);
        const productId = itemData._id;
        const isInFavs = await toggleFavoriteProduct(productId);

        if (isInFavs) {
            $item('#atfButton').customClassList.add("in-favs");
            $item('#atfButton').icon = _icons_.favoriteOn;
        } else {
            $item('#atfButton').customClassList.remove("in-favs");
            $item('#atfButton').icon = _icons_.favoriteOff;
        }
    });

    $w('#sortOptions').onChange((event) => {
        const selectedOption = event.target.value;
        setState({ sortOption: selectedOption });
    });

    $w('#filterIcon').onClick(async () => {
        const { searchResults } = getState();
        const { currentFilters } = await openLightbox("Filters", searchResults);
        setState({ currentFilters });
    });

    $w('#searchInput').onInput(searchInProductsDebounced);
}

// HELPERS
async function loadMore() {
    try {
        dispatch("notify", { message: "Loading more products..." });
        const skip = getState().searchResults.length;
        const value = $w('#searchInput').value;
        if (value.length > 1) {
            const { searchResults, totalCount } = await searchInProducts(value, skip);
            const state = getState();
            setState({ searchResults: [...state.searchResults, ...searchResults], totalCount });
        }
    } catch (err) {
        console.error(err);
    }
}

const searchInProductsDebounced = debounce(async () => {
    const searchPhrase = $w('#searchInput').value;
    if (searchPhrase.length > 1) {
        const { searchResults, totalCount } = await searchInProducts(searchPhrase);
        setState({ searchResults, totalCount });
    }
}, 500);