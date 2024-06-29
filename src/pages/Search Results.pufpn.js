import { searchProducts } from 'backend/search.web.js';
import { to, query } from 'wix-location-frontend';
import { debounce } from 'lodash';

$w.onReady(function () {
    const searchQuery = query["q"];

    if (searchQuery) {
        $w('#searchInput').value = searchQuery;
        handleSearch(searchQuery);
    }

    initPage();
});

async function handleSearch(searchParam) {
    let query;

    if (searchParam) {
        query = searchParam;
    } else {
        query = $w('#searchInput').value;
    }

    $w("#searchResultsProducts").searching = true;
    const searchResult = await searchProducts(query);
    $w('#resultsText').text = `Search results for "${query}". ${searchResult.length} product found that's currently in stock.`;
    $w("#searchResultsProducts").updateResults(searchResult);
    return null;
}

const debounceSearch = debounce(handleSearch, 500);

async function initPage() {
    eventListeners();
}

function eventListeners() {
    $w('#searchInput').onInput(debounceSearch);

    $w("#searchResultsProducts").onAddedToCart(() => {
        $w('#globalNotifier').showNotifier({
            message: `Product Added to Cart`,
            type: "success",
            action: {
                text: "Go to Cart",
                uiType: "button",
                removeNotifierOnClick: true,
                onClick: () => { to("/cart-page") }
            }
        })
    })
}