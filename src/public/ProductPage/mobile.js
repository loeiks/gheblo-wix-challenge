import { useScope, updateItem } from 'repeater-scope';
import { calculateDiscountPercentage } from './helpers';
import { v4 as uuidv4 } from 'uuid';
import { isEmpty, isEqual, keys } from 'lodash';
import { cart } from 'wix-stores-frontend';
import { openLightbox } from 'wix-window-frontend';
import { addProductToFavs } from 'backend/Products/favs';

/**
 * @function
 * @description
 * Renders the mobile view of product page.
 * 
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
export function renderMobileView(state, store) {
    $w('#productPageWidgetSection').delete();
    setupPageView(state, store);
}

// PAGE SETUP FOR ONE TIME
function setupPageView(state, { dispatch, setState, getState, connect }) {
    if (state.productOptions["Color"] && isEmpty(state._currentChoices)) {
        const defaultColorSelection = state.productOptions["Color"].choices[0].description;
        setState({ _currentChoices: { ...getState()._currentChoices, "Color": defaultColorSelection } });
    }
}

/**
 * @function
 * @description
 * Renders the mobile state events and reactions for events.
 * 
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
export function setupMobileStateEvents(state, { dispatch, setState, getState, connect }) {
    // To handle event reactions with elements we first setup event listeners before connection state listeners
    setEventListeners(state, { dispatch, setState, getState, connect });

    // When ribbon change we update the ribon data
    connect("ribbons", ({ ribbons }) => {
        if (ribbons) {
            if (ribbons.length > 0) {
                $w('#mobileRibbonTextBox').restore();
                $w('#mobileRibbonTextBox').expand();
                $w('#mobileRibbonText').text = ribbons[0]["text"];
            } else {
                $w('#mobileRibbonTextBox').delete();
            }
        } else {
            $w('#mobileRibbonTextBox').delete();
        }
    });

    // When some general details change we update all of them together (name, sku, images)
    connect(...[
        "name",
        "sku",
        "mediaItems",
        "description"
    ], ({ name, sku, variants, mediaItems, description }) => {
        // Update product name and SKU, if no single SKU found get from the first variant
        $w('#mobileProductName').text = name;
        $w('#mobileProductSku').text = `Product SKU: ${sku || variants[0].variant.sku}`;
        $w('#mobileModelDetails').text = description.replace("<p>", "").replace("</p>", "");

        updateGalleryImages(mediaItems);
    });

    // When price change we update the pricing details
    connect("price", ({ discountedPrice, price }) => {
        if (discountedPrice === price) {
            // Does not have discount
            $w('#mobileFormattedPrice').text = `${price}€`;
            $w('#mobileDiscount, #mobileUndiscountedPrice').delete();
        } else {
            // Has discount
            $w('#mobileFormattedPrice').text = `${discountedPrice}€`;
            $w('#mobileDiscount').text = `-%${calculateDiscountPercentage(price, discountedPrice).toFixed(0)}`;
            $w('#mobileUndiscountedPrice').text = `${price}€`;
            $w('#mobileDiscount, #mobileUndiscountedPrice').expand();
        }
    });

    // When product images by color change we update the color selection repeater
    connect("productImagesByColor", ({ productImagesByColor }) => {
        updateColorSelections(productImagesByColor);
    });

    // When product options change we update size selection repeater
    connect("productOptions", ({ productOptions }) => {
        updateSizeSelections(productOptions);
    });

    // When current images changes (because of color selection change) we update both size stock data and images in gallery
    connect("_currentImagesOfProduct", ({ _currentImagesOfProduct, productOptions }) => {
        if (_currentImagesOfProduct) {
            updateGalleryImages(_currentImagesOfProduct);
            updateSizeSelections(productOptions);
        }
    });

    // When color selection changes we update model data here
    connect("_currentModelInfo", ({ _currentModelInfo }) => {
        if (_currentModelInfo) {
            $w('#mobileModelDetails').text = _currentModelInfo;
        }
    });

    // When any info section data change update info sections repeater
    connect("additionalInfoSections", ({ additionalInfoSections }) => {
        $w("#mobileInfoSectionRepeater").data = additionalInfoSections.map((infoData) => {
            return {
                ...infoData,
                _id: uuidv4()
            }
        });
        $w("#mobileInfoSectionRepeater").expand();
    });

    // Check and update current variant based on available options
    connect("_currentChoices", ({ _currentChoices, productVariants, productOptions, productImagesByColor }) => {
        const selectionsCount = keys(productOptions);
        const selectedSelectionsCount = keys(_currentChoices);

        // Check if all required selections are picked so we can get variant data
        if (selectionsCount.length === selectedSelectionsCount.length) {
            const _currentVariant = productVariants.find((variantData) => {
                return isEqual(variantData.choices, _currentChoices);
            });

            setState({ _currentVariant });
        }

        updateSizeSelections(productOptions);
        updateColorSelections(productImagesByColor);
    });

    // Update variant based SKU in case of there is a different SKU for that variant
    connect("_currentVariant", ({ _currentVariant }) => {
        if (_currentVariant) {
            $w('#mobileProductSku').text = `Product SKU: ${_currentVariant.sku}`;
        }
    });

    connect("_isProductInFavs", ({ _isProductInFavs }) => {
        if (_isProductInFavs) {
            $w('#mobileAtfButton').customClassList.add("in-favs");
            $w('#mobileAtfButton').icon = getState()._pageIcons.inFavsIcon;
        }
    });
}

// SETUP EVENT ELEMENT LISTENERS
function setEventListeners(state, { dispatch, setState, getState, connect }) {
    // Setup color choices (color selection)
    $w('#mobileColorSelectionRepeater').onItemReady(($item, itemData, index) => {
        $item('#mobileColorChoicePreview').src = itemData.images[itemData.images.length - 2].src;

        // Remember selected color and keep it as selected in style
        const selectedColor = getState()._currentChoices["Color"];
        if (selectedColor === itemData.color) {
            $item("#mobileColorChoiceItem").customClassList.add("selected-color");
        }

        // Show how many more color options exist
        if (index === 2) {
            $item('#mobileColorChoicePreview').hide();
            $item('#mobileColorPlusText').expand();
            $item('#mobileColorPlusText').text = `+${getState().productImagesByColor.length - 2}`;
        }
    });

    $w('#mobileColorChoiceItem').onClick(async (event) => {
        openLightbox("MobileColorSelection", getState()).then(({
            _currentModelInfo,
            _currentImagesOfProduct,
            _currentChoices,
            selectedColorData
        }) => {
            moveSelectedColorToFirstPlace(selectedColorData, { getState, setState });

            setState({ _currentModelInfo });
            setState({ _currentImagesOfProduct });
            setState({ _currentChoices });

            // Update the selected color option in style
            updateItem(event, ($item, itemData, index) => {
                const selectedColor = getState()._currentChoices["Color"];
                if (selectedColor === itemData.color) {
                    $w("#mobileColorChoiceItem").customClassList.remove("selected-color");
                    $item("#mobileColorChoiceItem").customClassList.add("selected-color");
                }
            });
        });
    });

    // Setup Size choices (size selection)
    $w('#mobileSizeSelectionRepeater').onItemReady(($item, itemData, index) => {
        $item('#mobileSizeChoiceButton').collapseIcon();
        $item('#mobileSizeChoiceButton').label = itemData.value;

        const variantData = getVariantDataForSize(itemData.value, { getState });
        if (variantData.stock.inStock !== true) {
            $item('#mobileSizeChoiceButton').disable();
        } else {
            if (variantData.stock.trackQuantity) {
                if (variantData.stock.quantity < 10) {
                    $item('#mobileSizeChoiceButton').expandIcon();
                }
            }
        }

        // Keep selected size button in same style even if an update happens
        const selectedSize = getState()._currentChoices["Size"];
        if (selectedSize === itemData.value) {
            $item("#mobileSizeChoiceButton").customClassList.add("selected-size");
        }
    });

    $w('#mobileSizeChoiceButton').onClick((event) => {
        const { itemData, $item } = useScope(event);

        // Update Selections
        setState({ _currentChoices: { ...getState()._currentChoices, "Size": itemData.value } });

        // Remove same class for all buttons first then add the selected one and update style via this way
        $w("#mobileSizeChoiceButton").customClassList.remove("selected-size");
        $item("#mobileSizeChoiceButton").customClassList.add("selected-size");
    });

    // Setup info sections (extra info about products which is collapsable)
    $w("#mobileInfoSectionRepeater").onItemReady(($item, itemData, index) => {
        $item('#mobileInfoTitle').text = itemData.title;
        $item('#mobileInfoDescription').html = itemData.description;
    });

    $w('#mobileInfoTitle, #mobileInfoDescription').onClick((event) => {
        const { $item } = useScope(event);

        const { collapsedIcon, expandedIcon } = getState()._pageIcons

        if ($item('#mobileInfoDescription').collapsed) {
            $item('#mobileInfoDescription').expand();
            $item('#mobileInfoIcon').src = expandedIcon;
        } else {
            $item('#mobileInfoDescription').collapse();
            $item('#mobileInfoIcon').src = collapsedIcon;
        }
    });

    // Add to cart button
    $w('#mobileAtcButton').onClick(() => {
        $w('#mobileAtcButton').disable();
        
        const { _currentVariant, _id, _currentChoices } = getState();

        if (_currentVariant) {
            cart.addProducts([{
                productId: _id,
                quantity: 1,
                options: {
                    choices: _currentChoices
                }
            }]).then(() => {
                dispatch("notify", { message: "You have added product to your cart!", type: "success" });
                $w('#mobileAtcButton').enable();
            });
        } else {
            dispatch("notify", { message: "You haven't picked required selections yet!", type: "warning" });
            $w('#mobileAtcButton').enable();
        }
    });

    $w('#mobileImagesRepeater').onItemReady(($item, itemData, index) => {
        $item('#mobileImage').src = itemData.src;
        if (itemData.alt) {
            $item('#mobileImage').alt = itemData.alt;
        }
    });

    // Add to wishlist/favs button
    $w('#mobileAtfButton').onClick(async () => {
        const { _id } = getState();
        addProductToFavs(_id);
        $w('#mobileAtfButton').customClassList.add("in-favs");
        $w('#mobileAtfButton').icon = getState()._pageIcons.inFavsIcon;
    })
}

// HELPER FUNCTIONS
function updateGalleryImages(imageSet) {
    const filteredImageSet = imageSet.filter((item) => {
        return item.type.toLowerCase() === "image";
    });

    $w('#mobileImagesRepeater').data = filteredImageSet.map((item) => {
        return {
            ...item,
            _id: uuidv4()
        }
    });
}

function updateSizeSelections(productOptions) {
    if (productOptions["Size"]) {
        const choices = productOptions["Size"].choices;
        $w('#mobileSizeSelectionRepeater').data = choices.map((choice) => { return { ...choice, _id: uuidv4() } });
        $w('#mobileSizeSelectionRepeater').expand();
    }
}

function getVariantDataForSize(size, { getState }) {
    const { _currentChoices, productVariants } = getState();
    return productVariants.find((variantData) => {
        return isEqual(variantData.choices, { ..._currentChoices, "Size": size });
    });
}

function updateColorSelections(productImagesByColor) {
    $w('#mobileColorSelectionRepeater').data = [];

    // Only show 3 items maximum in mobile because selector is in lightbox and something more than 3 won't fit in mobile
    $w('#mobileColorSelectionRepeater').data = productImagesByColor.map((item) => { return { ...item, _id: uuidv4() } }).slice(0, 3);
    $w('#mobileColorSelectionRepeater').expand();
}

function moveSelectedColorToFirstPlace(selectedColorData, { getState, setState }) {
    // Find the index of the object
    const productImagesByColor = getState().productImagesByColor;
    const index = productImagesByColor.findIndex(item => isEqual(item, selectedColorData));

    if (index > 0) {
        // Remove the object from its current position
        const [object] = productImagesByColor.splice(index, 1);
        productImagesByColor.unshift(object);
        setState({ productImagesByColor });
    }
}