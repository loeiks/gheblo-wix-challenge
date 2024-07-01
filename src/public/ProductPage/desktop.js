import { useScope } from 'repeater-scope';
import { calculateDiscountPercentage } from './helpers';
import { v4 as uuidv4 } from 'uuid';
import { isEqual, keys } from 'lodash';
import { cart } from 'wix-stores-frontend';

/**
 * @function
 * @description
 * Renders the desktop and tablet view of product page.
 * 
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
export function renderDesktopView(state, store) {
    // $w('#mobileImagesSection, #mobileInfoSection, #productPageWidgetSection').delete();
    setupPageView(state, store);
}

// PAGE SETUP FOR ONE TIME
function setupPageView(state, { dispatch, setState, getState, connect }) {
    if (state.productOptions["Color"]) {
        const defaultColorSelection = state.productOptions["Color"].choices[0].description;
        setState({ _currentChoices: { ...getState()._currentChoices, "Color": defaultColorSelection } });
    }
}

/**
 * @function
 * @description
 * Renders the desktop and tablet state events and reactions for events.
 * 
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
export function setupDesktopStateEvents(state, { dispatch, setState, getState, connect }) {
    // To handle event reactions with elements we first setup event listeners before connection state listeners
    setEventListeners(state, { dispatch, setState, getState, connect });

    // When ribbon change we update the ribon data
    connect("ribbons", ({ ribbons }) => {
        if (ribbons) {
            if (ribbons.length > 0) {
                $w('#ribbonTextBox').restore();
                $w('#ribbonTextBox').expand();
                $w('#ribbonText').text = ribbons[0]["text"];
            } else {
                $w('#ribbonTextBox').delete();
            }
        } else {
            $w('#ribbonTextBox').delete();
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
        $w('#productName').text = name;
        $w('#productSku').text = `Product SKU: ${sku || variants[0].variant.sku}`;
        $w('#modelInfo').text = description.replace("<p>", "").replace("</p>", "");

        updateGalleryImages(mediaItems);
    });

    // When price change we update the pricing details
    connect("price", ({ discountedPrice, price }) => {
        if (discountedPrice === price) {
            // Does not have discount
            $w('#formattedPrice').text = `${price}€`;
            $w('#discount, #undiscountedPrice').delete();
        } else {
            // Has discount
            $w('#formattedPrice').text = `${discountedPrice}€`;
            $w('#discount').text = `-%${calculateDiscountPercentage(price, discountedPrice).toFixed(0)}`;
            $w('#undiscountedPrice').text = `${price}€`;
            $w('#discount, #undiscountedPrice').expand();
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
            $w('#modelInfo').text = _currentModelInfo;
        }
    });

    // When any info section data change update info sections repeater
    connect("additionalInfoSections", ({ additionalInfoSections }) => {
        $w("#infoSectionsRepeater").data = additionalInfoSections.map((infoData) => {
            return {
                ...infoData,
                _id: uuidv4()
            }
        });
        $w("#infoSectionsRepeater").expand();
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
        $w('#productSku').text = `Product SKU: ${_currentVariant.sku}`;
    });
}

// SETUP EVENT ELEMENT LISTENERS
function setEventListeners(state, { dispatch, setState, getState, connect }) {
    // Setup preview images
    $w('#productImagesPreview').onItemReady(($item, itemData, index) => {
        $item('#productImagePreview').src = itemData.src;
        if (itemData.alt) {
            $item('#productImagePreview').alt = itemData.alt;
        }
    });

    // Handle on preview image click (open required index item)
    $w('#productImagePreviewItem').onClick((event) => {
        const { itemData } = useScope(event);
        const imageIndex = $w('#productImages').items.findIndex((item) => {
            return item.src === itemData.src;
        });

        console.error("Wix's API is broken `navigateToIndex` is doesn't exist in gallery item so it's not working because of this...");
        $w('#productImages').navigateToIndex(imageIndex);
    });

    // Setup color choices (color selection)
    $w('#colorSelectionRepeater').onItemReady(($item, itemData, index) => {
        $item('#colorChoicePreview').src = itemData.images[itemData.images.length - 2].src;
        $item('#colorChoiceText').html = `<p style="background-color:${itemData.value};">${itemData.color}</p>`;

        // Remember selected color and keep it as selected in style
        const selectedColor = getState()._currentChoices["Color"];
        if (selectedColor === itemData.color) {
            $item("#colorSelectionItem").customClassList.add("selected-color");
        }
    });

    $w('#colorSelectionItem').onClick((event) => {
        const { itemData, $item } = useScope(event);
        setState({ _currentModelInfo: itemData.model });
        setState({ _currentImagesOfProduct: itemData.images });

        // Update Selections
        setState({ _currentChoices: { ...getState()._currentChoices, "Color": itemData.color } });

        // Remove same class for all items first then add the selected one and update style via this way
        $w("#colorSelectionItem").customClassList.remove("selected-color");
        $item("#colorSelectionItem").customClassList.add("selected-color");
    });

    // Setup Size choices (size selection)
    $w('#sizeSelectionRepeater').onItemReady(($item, itemData, index) => {
        $item('#sizeChoiceButton').collapseIcon();
        $item('#sizeChoiceButton').label = itemData.value;

        const variantData = getVariantDataForSize(itemData.value, { getState });
        if (variantData.stock.inStock !== true) {
            $item('#sizeChoiceButton').disable();
        } else {
            if (variantData.stock.trackQuantity) {
                if (variantData.stock.quantity < 10) {
                    $item('#sizeChoiceButton').expandIcon();
                }
            }
        }

        // Keep selected size button in same style even if an update happens
        const selectedSize = getState()._currentChoices["Size"];
        if (selectedSize === itemData.value) {
            $item("#sizeChoiceButton").customClassList.add("selected-size");
        }
    });

    $w('#sizeChoiceButton').onClick((event) => {
        const { itemData, $item } = useScope(event);

        // Update Selections
        setState({ _currentChoices: { ...getState()._currentChoices, "Size": itemData.value } });

        // Remove same class for all buttons first then add the selected one and update style via this way
        $w("#sizeChoiceButton").customClassList.remove("selected-size");
        $item("#sizeChoiceButton").customClassList.add("selected-size");
    });

    // Setup info sections (extra info about products which is collapsable)
    $w("#infoSectionsRepeater").onItemReady(($item, itemData, index) => {
        $item('#infoTitle').text = itemData.title;
        $item('#infoDescription').html = itemData.description;
    });

    $w('#infoTitle, #infoIcon').onClick((event) => {
        const { $item } = useScope(event);

        const { collapsedIcon, expandedIcon } = getState()._pageIcons

        if ($item('#infoDescription').collapsed) {
            $item('#infoDescription').expand();
            $item('#infoIcon').src = expandedIcon;
        } else {
            $item('#infoDescription').collapse();
            $item('#infoIcon').src = collapsedIcon;
        }
    });

    // Add to cart button
    $w('#atcButton').onClick(() => {
        const { _currentVariant, _id, _currentChoices } = getState();

        if (_currentVariant) {
            cart.addProducts([{
                productId: _id,
                quantity: 1,
                options: {
                    choices: _currentChoices
                }
            }]);
        }
    });
}

// HELPER FUNCTIONS
function updateGalleryImages(imageSet) {
    const filteredImageSet = imageSet.filter((item) => {
        return item.type.toLowerCase() === "image";
    });

    $w('#productImages').items = filteredImageSet;
    $w('#productImagesPreview').data = filteredImageSet.map((item) => {
        return {
            ...item,
            _id: uuidv4()
        }
    });
}

function updateSizeSelections(productOptions) {
    if (productOptions["Size"]) {
        const choices = productOptions["Size"].choices;
        $w('#sizeSelectionRepeater').data = choices.map((choice) => { return { ...choice, _id: uuidv4() } });
        $w('#sizeSelectionRepeater').expand();
    }
}

function getVariantDataForSize(size, { getState }) {
    const { _currentChoices, productVariants } = getState();
    return productVariants.find((variantData) => {
        return isEqual(variantData.choices, { ..._currentChoices, "Size": size });
    });
}

function updateColorSelections(productImagesByColor) {
    $w('#colorSelectionRepeater').data = [];
    $w('#colorSelectionRepeater').data = productImagesByColor.map((item) => { return { ...item, _id: uuidv4() } });
    $w('#colorSelectionRepeater').expand();
}