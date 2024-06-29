import { createStoreon } from 'storeon-velo';
import { path } from 'wix-location-frontend';
import { formFactor, openLightbox } from 'wix-window-frontend';
import { prefetchPageResources } from 'wix-site-frontend';
import { cart } from 'wix-stores-frontend';
import { getProductData } from 'backend/Products/data.web.js';
import { v4 as uuidv4 } from 'uuid';

const removeIcon = "https://static.wixstatic.com/media/510eca_3eea9158450d428aaa75dc0bda96705a~mv2.png";
const addIcon = "https://static.wixstatic.com/media/510eca_f91276b978324371ae93076204f63e7d~mv2.png";

const app = (store) => {
    store.on('@init', () => ({ choices: {} }));
};

const { getState, setState, dispatch, connect, readyStore } = createStoreon([app]);

$w.onReady(async function () {
    setState({ product: await getProductData(path[1]) });
    prefetchPageResources({ lightboxes: ["ProductImagePreview", "MobileColorSelection"] });
    eventListeners();
    storeonListeners();
    return readyStore();
});

function eventListeners() {
    if (formFactor != "Mobile") {
        $w('#desktopColorSelections').onItemReady(($item, itemData, index) => {
            $item("#desktopColorSelectionImage").src = itemData.mainMedia;
            $item("#desktopColorSelectionImage").alt = itemData.mainMediaAltText;
            $item("#desktopColorSelectionText").text = itemData.color;

            $item("#desktopColorSelectionItem").onClick(() => {
                const choices = getState().choices;
                setState({ choices: { ...choices, ["Color"]: itemData.value } });
                revertBoxColor(getState().previousColorSelection);
                setState({ previousColorSelection: itemData._id });
                $item("#desktopColorSelectionItem").style.borderColor = "#006a63";
                setState({ previewImages: itemData.images });
                setDesktopProductImages(itemData.images);
            })
        })

        $w('#desktopSizeSelections').onItemReady(($item, itemData, index) => {
            $item("#desktopSizeSelectionButton").label = itemData.description;

            if (itemData.inStock != true) {
                $item('#desktopSizeSelectionButton').disable();
            } else {
                $item('#desktopSizeSelectionButton').collapseIcon();
            }

            $item("#desktopSizeSelectionButton").onClick(() => {
                const choices = getState().choices;
                setState({ choices: { ...choices, ["Size"]: itemData.value } });
                revertButtonColor(getState().previousSizeSelection);
                setState({ previousSizeSelection: itemData._id });
                $item("#desktopSizeSelectionButton").style.borderColor = "#006a63";
                $item("#desktopSizeSelectionButton").style.color = "#006a63";
            })
        })

        $w('#desktopInfoSections').onItemReady(($item, itemData, index) => {
            $item("#desktopInfoTitle").text = itemData.title;
            $item("#desktopInfoDescription").html = itemData.description;

            $item("#desktopInfoTitle, #desktopInfoIcon").onClick(() => {
                if ($item("#desktopInfoDescription").collapsed) {
                    $item("#desktopInfoDescription").expand();
                    $item("#desktopInfoIcon").src = removeIcon;
                } else {
                    $item("#desktopInfoDescription").collapse();
                    $item("#desktopInfoIcon").src = addIcon;
                }
            })

            if (index === 0) {
                $item("#desktopInfoDescription").expand();
                $item("#desktopInfoIcon").src = removeIcon;
            }
        })

        $w('#desktopAtcButton').onClick(async () => {
            $w('#desktopAtcButton').label = "Just a sec...";

            const { product, choices } = getState();

            if (product.productOptions["Size"] && !choices["Size"]) {
                $w("#globalNotifier").showNotifier({
                    message: "Please select a size",
                    type: "warning"
                })
            } else if (product.productOptions["Color"] && !choices["Color"]) {
                $w("#globalNotifier").showNotifier({
                    message: "Please select a color",
                    type: "warning"
                })
            } else {
                await cart.addProducts([{
                    productId: product._id,
                    quantity: 1,
                    options: {
                        choices
                    }
                }])

                $w("#globalNotifier").showNotifier({
                    message: "Your New Look Added To Your Cart!",
                    type: "success"
                })

                cart.showMiniCart();
                $w('#desktopAtcButton').label = "Add to Cart";
            }
        })

        $w('#desktopSizeGuideButton').onClick(() => {
            const itemId = $w('#desktopInfoSections').data.filter((item) => {
                return item.title.toLowerCase() === "size guide";
            })

            if (itemId.length > 0) {
                $w('#desktopInfoSections').forItems([itemId[0]._id], ($item, itemData, index) => {
                    if ($item('#desktopInfoDescription').collapsed) {
                        $item('#desktopInfoDescription').expand()
                        $item('#desktopInfoItem').scrollTo();
                    }
                })
            }
        })

        $w('#desktopImageBox, #desktopSecondSection, #desktopThirdSection').onClick(() => {
            openLightbox("ProductImagePreview", getState().previewImages);
        })
    } else {
        $w('#mobileColorOptions').onItemReady(($item, itemData, index) => {
            $item("#mobileColorImage").src = itemData.mainMedia;
            $item("#mobileColorImage").alt = itemData.mainMediaAltText;

            if (index === 2) {
                $item("#mobileColorImage").hide();
                $item("#mobileColorPlusText").text = `+${(getState().product.productImagesByColor.length) - 2}`;
                $item("#mobileColorPlusText").expand();
            }

            $item("#mobileColorSelectionItem").onClick(() => {
                openLightbox("MobileColorSelection", getState().product.productImagesByColor)
                    .then((data) => {
                        if (data) {
                            const choices = getState().choices;
                            setState({ choices: { ...choices, ["Color"]: itemData.value } });
                            $w('#mobileImages').data = data.images.map((i) => { return { ...i, _id: uuidv4() } });
                        }
                    })
            })
        })

        $w('#mobileSizeSelections').onItemReady(($item, itemData, index) => {
            $item("#mobileSizeSelectionButton").label = itemData.description;

            if (itemData.inStock != true) {
                $item('#mobileSizeSelectionButton').disable();
            } else {
                $item('#mobileSizeSelectionButton').collapseIcon();
            }

            $item("#mobileSizeSelectionButton").onClick(() => {
                const choices = getState().choices;
                setState({ choices: { ...choices, ["Size"]: itemData.value } });
                revertButtonColor(getState().previousSizeSelection);
                setState({ previousSizeSelection: itemData._id });
                $item("#mobileSizeSelectionButton").style.borderColor = "#006a63";
                $item("#mobileSizeSelectionButton").style.color = "#006a63";
            })
        })

        $w('#mobileInfoSections').onItemReady(($item, itemData, index) => {
            $item("#mobileInfoTitle").text = itemData.title;
            $item("#mobileInfoDescription").html = itemData.description;

            $item("#mobileInfoTitle, #mobileInfoIcon").onClick(() => {
                if ($item("#mobileInfoDescription").collapsed) {
                    $item("#mobileInfoDescription").expand();
                    $item("#mobileInfoIcon").src = removeIcon;
                } else {
                    $item("#mobileInfoDescription").collapse();
                    $item("#mobileInfoIcon").src = addIcon;
                }
            })

            if (index === 0) {
                $item("#mobileInfoDescription").expand();
                $item("#mobileInfoIcon").src = removeIcon;
            }
        })

        $w('#mobileAtcButton').onClick(async () => {
            $w('#mobileAtcButton').label = "Just a sec...";

            const { product, choices } = getState();

            if (product.productOptions["Size"] && !choices["Size"]) {
                $w("#globalNotifier").showNotifier({
                    message: "Please select a size",
                    type: "warning"
                })
            } else if (product.productOptions["Color"] && !choices["Color"]) {
                $w("#globalNotifier").showNotifier({
                    message: "Please select a color",
                    type: "warning"
                })
            } else {
                await cart.addProducts([{
                    productId: product._id,
                    quantity: 1,
                    options: {
                        choices
                    }
                }])

                $w("#globalNotifier").showNotifier({
                    message: "Added To Cart",
                    type: "success"
                })

                $w('#mobileAtcButton').label = "Add to Cart";
            }
        })

        $w('#mobileImages').onItemReady(($item, itemData, index) => {
            $item('#mobileImage').src = itemData.src;
            $item('#mobileImage').alt = itemData.alt;

            if (index === ($w('#mobileImages').data.length - 1)) {
                $item('#mobileImage').onViewportEnter(() => {
                    $item('#mobileArrow').customClassList.add("rotated-element");
                })
            }
        })
    }
}

function storeonListeners() {
    connect("product", ({ product }) => {
        if (formFactor != "Mobile") {
            setupDesktopView(product);
        } else {
            setupMobileView(product);
        }
    });

    connect("choices", ({ choices, product }) => {
        if (product.productOptions["Size"] && !choices["Size"]) {
            $w('#mobileAtcButton, #desktopAtcButton').label = "Select Size";
        } else if (product.productOptions["Color"] && !choices["Color"]) {
            $w('#mobileAtcButton, #desktopAtcButton').label = "Select Color";
        } else {
            $w('#mobileAtcButton, #desktopAtcButton').label = "Add to Cart";
        }
    })
}

function setupDesktopView(product) {
    if (product.ribbons.length > 0) {
        $w('#desktopRibbonText').text = `${product.ribbons[0].text} Collection`;
    } else {
        $w('#desktopRibbonTextBox').delete();
    }

    $w('#desktopProductTitle').text = product.name;
    $w('#desktopProductSKU').text = `Product SKU: ${product.numericId}`;
    $w('#desktopFormattedPrice').text = product.formattedDiscountedPrice;

    if (product.discount.type != "NONE") {
        $w('#desktopDiscount').text = calculatePercentageDiscount(product.price, product.discountedPrice);
        $w('#desktopOldPrice').text = product.formattedPrice;
        $w('#desktopOldPrice, #desktopDiscount').expand();
    } else {
        $w('#desktopOldPrice, #desktopDiscount').delete();
    }

    if (product.productOptions["Color"]) {
        $w('#desktopColorSelections').data = product.productImagesByColor;
        $w('#desktopColorSelections').expand();
    } else {
        $w('#desktopColorSelections').delete();
    }

    if (product.productOptions["Size"]) {
        $w('#desktopSizeSelections').data = product.productOptions["Size"].choices.map((i) => { return { ...i, _id: uuidv4() } });
        $w('#desktopSizeSelections').expand();
    } else {
        $w('#desktopSizeSelections').delete();
    }

    const modelDetails = product.additionalInfoSections.filter((section) => {
        return section.title === "Model";
    });

    if (modelDetails.length > 0) {
        $w('#desktopModelDetails').html = modelDetails[0].description;
    } else {
        $w('#desktopModelDetails').delete();
    }

    $w('#desktopMainImage').src = product.mainMedia;
    $w('#desktopMainImage').alt = `${product.name.toLowerCase()} on model`;

    const additionalInfoSections = product.additionalInfoSections.filter((section) => {
        return section.title != "Model";
    }).map((info) => { return { ...info, _id: uuidv4() } });

    $w('#desktopInfoSections').data = additionalInfoSections;

    if (product.mediaItems.length >= 6) {
        setState({ previewImages: product.productVariantImages.images });
        setDesktopProductImages(product.productVariantImages.images);
    } else {
        $w('#desktopSecondSection, #desktopThirdSection').delete();
    }
}

function setupMobileView(product) {
    if (product.ribbons.length > 0) {
        $w('#mobileRibbonText').text = `${product.ribbons[0].text} Collection`;
    } else {
        $w('#mobileRibbonText').delete();
    }

    $w('#mobileProductTitle').text = product.name;
    $w('#mobileProductSku').text = `Product SKU: ${product.numericId}`;
    $w('#mobileFormattedPrice').text = product.formattedDiscountedPrice;

    if (product.discount.type != "NONE") {
        $w('#mobileDiscount').text = calculatePercentageDiscount(product.price, product.discountedPrice);
        $w('#mobileOldPrice').text = product.formattedPrice;
        $w('#mobileOldPrice, #mobileDiscount').show();
    } else {
        $w('#mobileOldPrice, #mobileDiscount').delete();
    }

    if (product.productOptions["Color"]) {
        $w('#mobileColorOptions').data = product.productImagesByColor;
        $w('#mobileColorOptions').expand();
    } else {
        $w('#mobileColorOptions').delete();
    }

    if (product.productOptions["Size"]) {
        $w('#mobileSizeSelections').data = product.productOptions["Size"].choices.map((i) => { return { ...i, _id: uuidv4() } });
        $w('#mobileSizeSelections').expand();
    } else {
        $w('#mobileSizeSelections').delete();
    }

    const modelDetails = product.additionalInfoSections.filter((section) => {
        return section.title === "Model";
    });

    if (modelDetails.length > 0) {
        $w('#mobileModelDetails').html = modelDetails[0].description;
        $w('#mobileModelDetails').expand();
    } else {
        $w('#mobileModelDetails').delete();
    }

    const additionalInfoSections = product.additionalInfoSections.filter((section) => {
        return section.title != "Model";
    }).map((info) => { return { ...info, _id: uuidv4() } });

    $w('#mobileInfoSections').data = additionalInfoSections;
    $w('#mobileImages').data = product.productVariantImages.images;
}

// Custom Functions
function calculatePercentageDiscount(oldPrice, discountedPrice) {
    let discountAmount = oldPrice - discountedPrice;
    let percentageDiscount = (discountAmount / oldPrice) * 100;
    let roundedPercentageDiscount = Math.ceil(percentageDiscount / 5) * 5;
    return `-${roundedPercentageDiscount}%`;
}

function revertButtonColor(itemId) {
    if (formFactor != "Mobile") {
        $w('#desktopSizeSelections').forItems([itemId], ($item, itemData, index) => {
            $item("#desktopSizeSelectionButton").style.borderColor = "#bec9c6";
            $item("#desktopSizeSelectionButton").style.color = "#5b5f5e";
        })
    } else {
        $w('#mobileSizeSelections').forItems([itemId], ($item, itemData, index) => {
            $item("#mobileSizeSelectionButton").style.borderColor = "#bec9c6";
            $item("#mobileSizeSelectionButton").style.color = "#5b5f5e";
        })
    }
}

function revertBoxColor(itemId) {
    if (formFactor != "Mobile") {
        $w('#desktopColorSelections').forItems([itemId], ($item, itemData, index) => {
            $item("#desktopColorSelectionItem").style.borderColor = "white";
        })
    } else {
        $w('#mobileColorOptions').forItems([itemId], ($item, itemData, index) => {
            $item("#mobileColorSelectionItem").style.borderColor = "#bec9c6";
        })
    }
}

function setDesktopProductImages(images) {
    $w('#desktopMainImage').src = images[0].src;
    $w('#desktopMainImage').alt = images[0].alt;
    $w('#desktopBackImage').src = images[1].src;
    $w('#desktopBackImage').alt = images[1].alt;
    $w('#desktopFrontImage').src = images[2].src;
    $w('#desktopFrontImage').alt = images[2].alt;
    $w('#desktopSideImage').src = images[3].src;
    $w('#desktopSideImage').alt = images[3].alt;
    $w('#desktopProductImage').src = images[4].src;
    $w('#desktopProductImage').alt = images[4].alt;
    $w('#desktopCloseImage').src = images[5].src;
    $w('#desktopCloseImage').alt = images[5].alt;
}