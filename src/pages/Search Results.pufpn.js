import { createStoreon } from 'storeon-velo';
import { query, to } from 'wix-location-frontend';
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { calculateDiscountPercentage } from 'public/ProductPage/helpers';
import { searchInProducts } from 'backend/Search/search_products.web';
import { showNotifier } from 'public/notifier';
import { debounce, orderBy } from 'lodash';
import { authentication } from 'wix-members-frontend';
import { useScope } from 'repeater-scope';
import { toggleFavoriteProduct } from 'backend/Products/favs.web.js';
import { _icons_ } from 'public/icons';
import { filterProducts } from 'public/Filters/filtering';

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

    connect("searchResults", ({ searchResults, filtersStatus, currentFilters, }) => {
        if (!searchResults) return null;

        if (searchResults.length > 0) {
            if (filtersStatus) {
                setState({ noProducts: false });
                const filteredResults = filterProducts(currentFilters, searchResults);
                setState({ searchResultsFiltered: filteredResults, filtersStatus: true });
                $w('#resultsTotal').text = `${searchResults.length} results in total.`;
            } else {
                setState({ noProducts: false });
                $w('#productsRepeater').data = [];
                $w('#productsRepeater').data = searchResults;
                dispatch("handleSort");
                $w('#resultsTotal').text = `${searchResults.length} results in total.`;
            }
        } else {
            setState({ noProducts: true });
        }
    });

    connect("noProducts", ({ noProducts }) => {
        if (noProducts) {
            $w('#productsRepeater').collapse();
            $w('#noProductsText').expand();
        } else {
            $w('#productsRepeater').expand();
            $w('#noProductsText').collapse();
        }
    });

    connect("loadMore", ({ loadMore, totalCount }) => {
        if (!loadMore) return null;

        if ($w('#productsRepeater').data.length < totalCount) {
            dispatch("loadMoreProducts");
        }
    });

    connect("sortOption", ({ sortOption, searchResults }) => {
        if (sortOption === "newest") {
            // Newest Sorting
            const updated = sortByCreatedDate(searchResults);
            setState({ searchResults: updated });
        } else if (sortOption === "plowhigh") {
            // Price High to Low Sorting
            const updated = orderBy(searchResults, ['discountedPrice'], ['desc']);
            setState({ searchResults: updated });
        } else if (sortOption === "phighlow") {
            // Price Low to High Sorting
            const updated = orderBy(searchResults, ['discountedPrice'], ['asc']);
            setState({ searchResults: updated });
        }
    });

    connect("currentFilters", ({ currentFilters, searchResults }) => {
        if (!currentFilters) {
            $w('#productsRepeater').data = [];
            $w('#productsRepeater').data = searchResults;
            dispatch("handleSort");
        } else {
            const filteredResults = filterProducts(currentFilters, searchResults);
            setState({ searchResultsFiltered: filteredResults, filtersStatus: true });
        }
    });

    connect("filtersStatus", ({ filtersStatus, searchResultsFiltered }) => {
        if (!filtersStatus || !searchResultsFiltered) return null;

        $w('#productsRepeater').data = [];
        $w('#productsRepeater').data = searchResultsFiltered;
        // Set sorting to newest by default again
        $w('#sortOptions').value = "newest";
        dispatch("handleSort");
        setState({ noProducts: false });
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
        $item('#productImage').link = `https://www.gheblo.com/product-page/${itemData.slug}/`;
        $item('#productImage').target = "_self";
    });

    $w('#loadMoreLine').onViewportEnter(() => {
        setState({ loadMore: 1 });
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

    $w('#filterIcon').onClick(async (event) => {
        const { searchResults } = getState();
        const { currentFilters } = await openLightbox("Filters", searchResults);
        setState({ currentFilters });

        let hasFilter;
        if (currentFilters) {
            for (const [key, filter] of Object.entries(currentFilters)) {
                if (filter.length > 0 && !hasFilter) hasFilter = true;
            }
        }

        if (hasFilter) {
            $w('#filterIcon').customClassList.add("has-filters");
        } else {
            $w('#filterIcon').customClassList.remove("has-filters");
        }
    });

    $w('#searchInput').onInput(searchInProductsDebounced);
}

// HELPERS
const loadMore = debounce(async (state) => {
    dispatch("notify", { message: "Loading more products..." });

    const skip = $w('#productsRepeater').data.length;
    const value = $w('#searchInput').value;
    if (value.length > 1) {
        const { searchResults, totalCount } = await searchInProducts(value, skip);
        setState({ searchResults, totalCount });
    }
}, 1000);

const searchInProductsDebounced = debounce(async () => {
    const searchPhrase = $w('#searchInput').value;
    if (searchPhrase.length > 1) {
        const { searchResults, totalCount } = await searchInProducts(searchPhrase);
        setState({ searchResults, totalCount });
    }
}, 500);

function parseDateString(dateObject) {
    const dateStr = dateObject.$date;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}

function sortByCreatedDate(products) {
    products.forEach(product => {
        const parsedDate = parseDateString(product.createdDate);
        if (parsedDate) {
            product.createdDate = parsedDate;
        }
    });

    return orderBy(products, ['createdDate'], ['desc']);
}