import { getCurrentCart, removeItemFromCart, updateCurrentCartItem, getVariantSockQuantity, getCheckoutURL } from 'backend/Stores/custom_cart.web';
import { createStoreon } from 'storeon-velo';
import { query, to } from 'wix-location-frontend';
import { useScope } from 'repeater-scope';
import { v4 as uuidv4 } from 'uuid';
import { isEqual, max } from 'lodash';
import { product } from "wix-stores-frontend";
import { showNotifier } from 'public/notifier';
import { lightbox } from 'wix-window-frontend';

// Setup State Manager
const cartStore = (store) => {
    store.on("@init", () => ({}));

    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });
}

// State Manager Functions
const store = createStoreon([cartStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    initLightbox();
    return readyStore();
});

async function initLightbox() {
    // Set state events and pass current cart data to the state manager
    setupStateEvents();

    // Get current cart data and pass it to init function
    const { cartData } = await getCurrentCart();
    cartData ? setState({ cartData }) : setState({ cartData: null });
}

function setupStateEvents() {
    setEventListeners();

    // Listen for cart data and handle changes (price related stuff)
    connect("cartData", ({ cartData }) => {
        if (cartData === undefined) return null;

        if (cartData === null) {
            $w('#cartTitle').text = `Cart`;
            $w('#noLineItems').expand();
            $w('#lineItems').collapse();
            $w('#preloader').collapse();
            return null;
        }

        $w('#estimatedTotal').text = cartData.priceSummary.total.formattedAmount; //@ts-ignore
        $w('#totalText, #estimatedTotal').expand();

        setState({ lineItems: cartData.cart.lineItems });
        $w('#preloader').collapse();
    });

    // Handle changes in line items from cart
    connect("lineItems", ({ lineItems }) => {
        if (lineItems) {
            if (lineItems.length > 0) {
                $w('#cartTitle').text = `Cart (${lineItems.length})`;
                $w('#noLineItems').collapse();
                $w('#lineItems').expand();

                // Pass line items to the repeater
                $w('#lineItems').data = [];
                $w('#lineItems').data = lineItems;
            } else {
                $w('#cartTitle').text = `Cart`;
                $w('#noLineItems').expand();
                $w('#lineItems').collapse();
            }
        }
    });

    connect("_currentState", ({ _currentState }) => {
        if (!_currentState) return null;
        $w('#stateBox').changeState(_currentState);
    });

    connect("_currentItem", ({ _currentItem }) => {
        if (!_currentItem) return null;
        const selections = _currentItem.catalogReference.options.options;

        setState({ _currentQuantity: _currentItem.quantity });
        setState({ _currentItemChoices: selections });

        $w('#productNameE').text = _currentItem.productName.original;
        $w('#productPriceE').text = _currentItem.price.formattedAmount;
    });

    connect("_currentItemChoices", ({ _currentItemChoices, _previousColorOption }) => {
        if (!_currentItemChoices) return null;

        //@ts-ignore
        $w('#productImages').items = findVariantImages();
        if (_currentItemChoices["Color"] !== _previousColorOption) { //@ts-ignore
            // Save image selection to prevent re-renders
            setState({ _previousColorOption: _currentItemChoices["Color"] });
        }

        // Setup option boxes
        setupOptions();
    })

    connect("_currentQuantity", ({ _currentQuantity }) => {
        if (!_currentQuantity) return null;

        if (_currentQuantity > 1) {
            $w('#countMinus').show();
        } else {
            $w('#countMinus').hide();
        }

        $w('#quantity').text = `${_currentQuantity}`;
    })
}

function setEventListeners() {
    $w('#lineItems').onItemReady(($item, itemData, index) => {
        // Setup product details in repeater
        if (itemData.variantImage) {
            $item('#productImage').src = itemData.variantImage;
        } else {
            $item('#productImage').src = itemData.image;
        }

        $item('#productImage').link = itemData.url;
        $item('#productImage').target = "_blank";
        $item('#productName').text = itemData.productName.original;

        if (itemData.quantity > 1) {
            $item('#productPriceDetails').html = `<p class="font_8">${itemData.price.formattedAmount} · ${itemData.quantity}x · <span style="color:#76777a;">${itemData.options["Size"]}</span></p>`;
        } else {
            $item('#productPriceDetails').html = `<p class="font_8">${itemData.price.formattedAmount} · <span style="color:#76777a;">${itemData.options["Size"]}</span></p>`;
        }
    });

    $w('#removeItemBtn').onClick(async (event) => {
        const { itemData } = useScope(event);

        const { lineItems } = getState();
        const updatedLineItems = lineItems.filter(lineItem => lineItem._id !== itemData._id);
        setState({ lineItems: updatedLineItems });

        const { cartData } = await removeItemFromCart([itemData._id]);
        setState({ cartData });
    });

    $w('#editItemBtn').onClick(async (event) => {
        const { itemData } = useScope(event);
        setState({ _currentItem: itemData, _currentState: "editItem" });
    });

    // EDITING
    $w('#sizeSelectionRepeater').onItemReady(($item, itemData, index) => {
        $item('#sizeChoiceButton').label = itemData.description;

        if (checkIfSelected("Size", itemData.description)) {
            $item('#sizeChoiceButton').customClassList.add("selected-size");
        } else {
            $item('#sizeChoiceButton').customClassList.remove("selected-size");
        }
    });

    $w('#colorOptions').onItemReady(($item, itemData, index) => {
        $item('#colorChoiceBox').style.backgroundColor = itemData.value;

        if (checkIfSelected("Color", itemData.description)) {
            $item('#colorChoiceBox').customClassList.add("selected-color-cart");
        } else {
            $item('#colorChoiceBox').customClassList.remove("selected-color-cart");
        }
    });

    $w('#countPlus').onClick(() => {
        const { _currentQuantity } = getState();
        setState({ _currentQuantity: _currentQuantity + 1 });
    });

    $w('#countMinus').onClick(() => {
        const { _currentQuantity } = getState();
        if (_currentQuantity > 1) {
            setState({ _currentQuantity: _currentQuantity - 1 });
        }
    });

    $w('#sizeChoiceButton').onClick((event) => {
        const { itemData } = useScope(event);
        const { _currentItemChoices } = getState();
        setState({ _currentItemChoices: { ..._currentItemChoices, "Size": itemData.description } });
    });

    $w('#colorChoiceBox').onClick((event) => {
        const { itemData } = useScope(event);
        const { _currentItemChoices } = getState();
        setState({ _currentItemChoices: { ..._currentItemChoices, "Color": itemData.description } });
    });

    $w('#saveOptionsBtn').onClick(async () => {
        $w('#saveOptionsBtn').disable();
        const { _currentQuantity, _currentItemChoices, _currentItem, lineItems } = getState();
        const productId = _currentItem.catalogReference.catalogItemId;
        $w('#saveOptionsBtn').label = "Checking Availability...";

        const { availableForPurchase } = await product.getOptionsAvailability(productId, _currentItemChoices);
        const maxQuantity = await getVariantSockQuantity(_currentItemChoices, productId);

        if (!availableForPurchase) {
            $w('#saveOptionsBtn').label = "Save Options";
            $w('#saveOptionsBtn').enable();
            $w('#warningMessage').text = `We don't have these options in stock. Please choose another option.`;
            $w('#warningMessage').expand();
            return null;
        }

        if (maxQuantity < _currentQuantity) {
            $w('#warningMessage').text = `We have only ${maxQuantity} in our stock. Would you like to continue with ${maxQuantity} instead?`;
            $w('#saveOptionsBtn').label = `Yes Update with Quantity (${maxQuantity})`;
            $w('#saveOptionsBtn').enable();
            setState({ _currentQuantity: maxQuantity });
            $w('#warningMessage').expand();
            return null;
        }

        $w('#warningMessage').collapse();

        const newLineItem = {
            productId,
            itemId: _currentItem._id,
            choices: _currentItemChoices,
            quantity: _currentQuantity,
            variantId: _currentItem.productData.variants.find(v => isEqual(v.choices, _currentItemChoices))._id
        }

        $w('#saveOptionsBtn').label = "Saving Changes...";
        const { cartData } = await updateCurrentCartItem(lineItems, newLineItem);
        setState({ cartData });

        setState({ _currentState: "myCart" });
        $w('#saveOptionsBtn').enable();
        $w('#saveOptionsBtn').label = "Save Options";
    });

    //@ts-ignore
    $w('#backToCartBtn, #editTitle').onClick(() => {
        setState({ _currentState: "myCart" });
    });

    $w('#createCheckoutBtn').onClick(async () => {
        $w('#createCheckoutBtn').label = "Just a Sec...";
        const checkoutURL = await getCheckoutURL();
        $w('#createCheckoutBtn').label = "Redirecting...";
        to(checkoutURL);
    });

    $w('#closeCartIcon').onClick(() => {
        lightbox.close();
    });
}

// HELPERS
function findVariantImages() {
    const { _currentItem, _currentItemChoices } = getState();
    if (_currentItemChoices["Color"]) {
        return _currentItem.imagesByColor.find(i => i.color === _currentItemChoices["Color"]).images;
    } else {
        return _currentItem.productData.mediaItems;
    }
}

function setupOptions() {
    const { _currentItem } = getState();

    if (_currentItem.productData.productOptions["Size"]) {
        $w('#sizeSelectionRepeater').data = _currentItem.productData.productOptions["Size"].choices.map(c => ({ ...c, _id: uuidv4() }));
        $w('#sizeSelectionsBox').expand();
    }

    if (_currentItem.productData.productOptions["Color"]) {
        $w('#colorOptions').data = _currentItem.productData.productOptions["Color"].choices.map(c => ({ ...c, _id: uuidv4() }));
        $w('#colorSelectionsBox').expand();
    }
}

function checkIfSelected(type, value) {
    const { _currentItemChoices } = getState();
    return _currentItemChoices[type] === value;
}