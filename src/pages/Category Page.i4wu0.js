import { createStoreon } from 'storeon-velo';
import { query, path } from 'wix-location-frontend';
import { openLightbox } from 'wix-window-frontend';
import { calculateDiscountPercentage } from 'public/ProductPage/helpers';
import { showNotifier } from 'public/notifier';
import { debounce } from 'lodash';
import { authentication } from 'wix-members-frontend';
import { useScope } from 'repeater-scope';
import { toggleFavoriteProduct } from 'backend/Products/favs.web.js';
import { _icons_ } from 'public/icons';
import { filterProducts, sortProducts } from 'public/Filters/filtering';
import { getCollectionDataBySlug } from 'backend/Stores/collections.web';

const collectionStore = (store) => {
    store.on("@init", () => ({}));

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
    store.on("updateResults", ({ sortOption, collectionProducts, filtersStatus, currentFilters }) => {
        let products = collectionProducts;
        if (filtersStatus) {
            products = filterProducts(currentFilters, collectionProducts);
        }

        products = sortProducts(sortOption, products);
        setState({ products });
    });
}

const store = createStoreon([collectionStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(async () => {
    await $w('#nativeCategorySection').delete();
    const collectionResult = await getCollectionDataBySlug(path[0]);
    initPage(collectionResult);
    return readyStore();
});

async function initPage({ collectionProducts, collection, totalCount }) {
    setupStateEvents();
    setState({ collectionProducts, collection, totalCount });
}

function setupStateEvents() {
    setEventListeners();

    connect("sortOption", () => { dispatch("updateResults"); });
    connect("collectionProducts", () => { dispatch("updateResults"); });
    connect("products", ({ products }) => {
        if (!products) return null;

        if (products.length > 0) {
            $w('#productsRepeater').expand();
            $w('#noProductsText').collapse();
            $w('#productsRepeater').data = products;
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

    connect("collection", ({ collection, totalCount }) => {
        if (!collection) return null;
        $w('#collectionName').text = collection.name;
        $w('#resultsTotal').text = `${totalCount} results in total.`;
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
        $item('#productImage').link = `https://www.gheblo.com/product-page/${itemData.slug}/`;
        $item('#productImage').target = "_self";
    });

    $w('#loadMoreLine').onViewportEnter(() => {
        const { totalCount, collectionProducts } = getState();
        if (collectionProducts.length < totalCount) {
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
        const { collectionProducts } = getState();
        const { currentFilters } = await openLightbox("Filters", collectionProducts);
        setState({ currentFilters });
    });
}

// HELPERS
async function loadMore() {
    try {
        dispatch("notify", { message: "Loading more products..." });
        const skip = getState().collectionProducts.length;
        const { collectionProducts, collection, totalCount } = await getCollectionDataBySlug(path[0], skip);
        const state = getState();
        setState({ collectionProducts: [...state.collectionProducts, ...collectionProducts], collection, totalCount });
    } catch (err) {
        console.error(err);
    }
}