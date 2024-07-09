import { lightbox } from 'wix-window-frontend';
import { createStoreon } from 'storeon-velo';
import { discountOptions, priceOptions } from 'public/Filters/filtering';
import { v4 as uuidv4 } from 'uuid';
import { query } from 'wix-location-frontend';
import { uniqWith, isEqual } from 'lodash';
import { useScope } from 'repeater-scope';
import { session } from 'wix-storage-frontend';

const filtersStore = (store) => {
    store.on("@init", () => ({
        currentFilters: {}
    }));

    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });
}

const store = createStoreon([filtersStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    initLightbox();
    return readyStore();
});

async function initLightbox() {
    setupStateEvents();
    const searchResults = lightbox.getContext();

    let sizeOptions = [];
    let colorOptions = [];

    for (const product of searchResults) {
        for (const [key, option] of Object.entries(product.productOptions)) {
            if (key === "Size") {
                sizeOptions = sizeOptions.concat(option.choices.map((choice) => {
                    return {
                        label: choice.description,
                        value: choice.value
                    }
                }));
            }

            if (key === "Color") {
                colorOptions = colorOptions.concat(option.choices.map((choice) => {
                    return {
                        label: choice.description,
                        value: choice.value
                    }
                }));
            }
        }
    }

    sizeOptions = uniqWith(sizeOptions, isEqual);
    colorOptions = uniqWith(colorOptions, isEqual);

    setState({
        filters: [
            { options: sizeOptions, title: "Filter by Size", _id: uuidv4(), isChoice: true, choice: "Size" },
            { options: colorOptions, title: "Filter by Color", _id: uuidv4(), isChoice: true, choice: "Color" },
            { options: priceOptions, title: "Filter with Price Limit", _id: uuidv4(), choice: "Price" },
            { options: discountOptions, title: "Filter on Discount", _id: uuidv4(), choice: "Discount" }
        ]
    });
}

function setupStateEvents() {
    setEventListeners();

    connect("filters", ({ filters }) => {
        if (!filters) return null;

        for (const filter of filters) {
            const savedValues = session.getItem("_filters_" + filter.choice);

            if (savedValues) {
                filter.savedValues = JSON.parse(savedValues);
            }
        }

        updateFilters(filters);
    });
}

function setEventListeners() {
    $w('#filteringOptions').onItemReady(($item, itemData, index) => {
        $item('#filterTitle').text = itemData.title;
        $item('#filterTags').options = itemData.options;

        if (itemData.savedValues) {
            $item('#filterTags').value = itemData.savedValues;
            const { currentFilters } = getState();
            setState({ currentFilters: { ...currentFilters, [itemData.choice]: itemData.savedValues } });
        }
    });

    $w('#clearFilters').onClick(() => { //@ts-ignore
        $w('SelectionTags').value = [];
        const data = $w('#filteringOptions').data.map((item) => {
            session.removeItem("_filters_" + item.choice);

            return {
                ...item,
                savedValues: undefined,
                _id: uuidv4()
            }
        });

        updateFilters(data);
        setState({ currentFilters: {} });
    });

    $w('#filterTags').onChange((event) => {
        const { itemData, $item, data } = useScope(event);
        const value = $item('#filterTags').value;
        session.setItem("_filters_" + itemData.choice, JSON.stringify(value));

        const updatedItemData = {
            ...itemData,
            savedValues: value,
            _id: uuidv4()
        }

        const oldData = data.filter(item => item._id !== itemData._id);
        updateFilters([...oldData, updatedItemData]);
    })

    $w('#applyFilters').onClick(() => {
        const { currentFilters } = getState();
        lightbox.close({ currentFilters });
    });
}

function updateFilters(updatedFilterOptions) {
    const sortedData = sortProducts(updatedFilterOptions);
    $w('#filteringOptions').data = sortedData;
}

function sortProducts(filterOptions) {
    const sortOrder = {
        Size: 1,
        Color: 2,
        Price: 3,
        Discount: 4
    };

    filterOptions.sort((a, b) => {
        let choiceA = a.choice;
        let choiceB = b.choice;

        if (sortOrder[choiceA] < sortOrder[choiceB]) {
            return -1;
        } else if (sortOrder[choiceA] > sortOrder[choiceB]) {
            return 1;
        } else {
            return 0;
        }
    });

    return filterOptions;
}