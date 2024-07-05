// Wix API Imports
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import { remove } from 'lodash';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
// Backend Imports
import { createReview, deleteReview, updateReview } from 'backend/Reviews/reviews.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const myAccountStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    store.on("createReview", async ({ _currentProduct, reviews, reviewThemProducts }) => {
        try {
            const reviewData = {
                productId: _currentProduct.entity._id,
                content: {
                    body: $w('#reviewCommentInput').value,
                    rating: $w('#reviewRatingInput').value,
                    media: []
                }
            }

            // Save media images
            const selectedImages = $w('#imageUploadInput').value;
            if (selectedImages.length > 0) {
                const uploadedImages = await $w('#imageUploadInput').uploadFiles();
                for (const image of uploadedImages) {
                    reviewData.content.media.push(image.fileUrl);
                }
            }

            const createdReview = await createReview(reviewData);
            if (createdReview) {
                dispatch("notify", { message: "Nice! Review has been published with others!", type: "success" });

                if (reviews) {
                    setState({ reviews: [...reviews, createdReview] });
                } else {
                    setState({ reviews: [createdReview] });
                }

                const updatedReviewThemProducts = reviewThemProducts.filter(p => p.entity._id !== reviewData.productId);
                setState({ reviewThemProducts: updatedReviewThemProducts });

                clearFields();
                setState({ _currentState: "Reviews" });
                updateMenuStatus("Reviews");
            } else {
                dispatch("notify", { message: "Noo! Failed to share review!", type: "error" });
            }

            $w('#shareReviewButton').enable();
        } catch (err) {
            $w('#shareReviewButton').enable();
            console.error(err);
            dispatch("notify", { message: "Noo! Failed to share review!", type: "error" });
        }
    });

    store.on("editReview", async ({ _currentReview, reviews }) => {
        try {
            const copyCurrentReview = { ..._currentReview };

            const reviewData = {
                ...copyCurrentReview,
                content: {
                    body: $w('#reviewCommentInput').value,
                    rating: $w('#reviewRatingInput').value,
                    media: copyCurrentReview.content.media
                }
            }
            delete reviewData["product"];

            // Save media images
            const selectedImages = $w('#imageUploadInput').value;
            if (selectedImages.length > 0) {
                const uploadedImages = await $w('#imageUploadInput').uploadFiles();
                for (const image of uploadedImages) {
                    reviewData.content.media = [];
                    reviewData.content.media.push(image.fileUrl);
                }
            }

            const updatedReview = await updateReview(copyCurrentReview._id, reviewData, reviewData.productId);
            if (updatedReview) {
                dispatch("notify", { message: "Review has been updated!", type: "success" });

                const removedReviews = remove(reviews, review => review._id === _currentReview._id);
                setState({ reviews: removedReviews });
                setState({ reviews: [updatedReview] });

                clearFields();
                setState({ _currentState: "Reviews" });
            } else {
                dispatch("notify", { message: "Failed to update review!", type: "error" });
            }

            $w('#shareReviewButton').enable();
        } catch (err) {
            $w('#shareReviewButton').enable();
            console.error(err);
            dispatch("notify", { message: "Failed to update review!", type: "error" });
        }
    });

    store.on("deleteReview", async ({ _currentReview, reviews }) => {
        try {
            const response = await deleteReview(_currentReview._id);

            if (response) {
                dispatch("notify", { message: "Review has been deleted!", type: "success" });

                const updatedReviews = reviews.filter(r => r._id !== _currentReview._id);
                if (updatedReviews.length > 0) {
                    setState({ reviews: updatedReviews });
                } else {
                    setState({ reviews: [] });
                }

                setState({ _currentState: "Reviews" });
            } else {
                dispatch("notify", { message: "Failed to delete review!", type: "error" });
            }
        } catch (err) {
            console.error(err);
            dispatch("notify", { message: "Failed to delete review!", type: "error" });
        }
    });
}

// Setup Store Functions
const store = createStoreon([myAccountStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    $w('Repeater').data = [];
    const routerData = getRouterData();
    initPage(routerData);
    return readyStore();
});

async function initPage(routerData) {
    // Register State Events
    setupStateEvents();
    highLightCurrentTab();

    const {
        currentMemberHeaderData,
        reviewThemProducts,
        reviews
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);
    updateMenuStatus("Review Them");

    setState({
        reviewThemProducts,
        reviews: reviews.items,
        reviewsResponse: reviews
    });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("reviewThemProducts", ({ reviewThemProducts }) => {
        if (reviewThemProducts) {
            if (reviewThemProducts.length > 0) {
                setState({ noReviewThemProducts: false });
                $w('#reviewThemRepeater').data = [];
                $w('#reviewThemRepeater').data = reviewThemProducts;
            } else {
                setState({ noReviewThemProducts: true });
            }
        } else {
            setState({ noReviewThemProducts: true });
        }
    });

    connect("noReviewThemProducts", ({ noReviewThemProducts }) => {
        if (noReviewThemProducts === true) {
            $w('#reviewThemRepeater').collapse();
            $w('#noReviewThemProductsText').expand();
        } else {
            $w('#noReviewThemProductsText').collapse();
            $w('#reviewThemRepeater').expand();
        }
    });

    connect("reviews", ({ reviews }) => {
        if (reviews) {
            if (reviews.length > 0) {
                setState({ noReviews: false });
                $w('#reviewsRepeater').data = [];
                $w('#reviewsRepeater').data = reviews;
            } else {
                setState({ noReviews: true });
            }
        } else {
            setState({ noReviews: true });
        }
    });

    connect("noReviews", ({ noReviews }) => {
        if (noReviews === true) {
            $w('#reviewsRepeater').collapse();
            $w('#noReviewsText').expand();
        } else {
            $w('#noReviewsText').collapse();
            $w('#reviewsRepeater').expand();
        }
    });

    connect("_currentState", ({ _currentState, _currentReview }) => {
        if (_currentState) {
            switch (_currentState) {
                case "Review Them": {
                    $w('#stateBox').changeState("reviewThem");
                    $w('#title').text = "Review Products";
                    break;
                }
                case "Reviews": {
                    $w('#stateBox').changeState("reviews");
                    $w('#title').text = "My Reviews";
                    break;
                }
                case "Edit": {
                    $w('#stateBox').changeState("editAndCreateReview");
                    $w('#title').text = "Edit Review";
                    $w('#shareReviewButton').label = "Update Review";

                    $w('#reviewRatingInput').value = _currentReview.content.rating;
                    $w('#reviewCommentInput').value = _currentReview.content.body;
                    $w('#imageUploadInput').buttonLabel = "Add to Replace Existing Images";

                    break;
                }
                case "Create": {
                    $w('#stateBox').changeState("editAndCreateReview");
                    $w('#title').text = "Create Review";
                    $w('#shareReviewButton').label = "Share Your Review";
                    break;
                }
                default: {
                    $w('#stateBox').changeState("reviewThem");
                    $w('#title').text = "Review Products";
                    break;
                }
            }
        }
    });
}

function setEventListeners() {
    $w('#reviewsStateMenu').onItemClick((event) => {
        const itemLabel = event.item.label;
        setState({ _currentState: itemLabel });
        updateMenuStatus(itemLabel);
    });

    $w('#reviewThemRepeater').onItemReady(($item, itemData, index) => {
        $item('#productImage').src = itemData.entity.mainMedia;
        $item('#productName').text = itemData.entity.name;
    });

    $w('#productRatingInput').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentState: "Create", _currentProduct: itemData });
    });

    $w('#shareReviewButton').onClick((event) => {
        $w('#shareReviewButton').disable();
        const { _currentState } = getState();
        const isValid = validateInputs();

        if (_currentState === "Edit" && isValid) {
            dispatch("editReview");
        } else if (_currentState === "Create") {
            dispatch("createReview");
        }
    });

    $w('#reviewsRepeater').onItemReady(($item, itemData, index) => {
        $item('#reviewProductImage').src = itemData.product[0].entity.mainMedia;
        $item('#reviewProductName').text = itemData.product[0].entity.name;
        $item('#reviewComment').text = itemData.content.body;
        $item('#rating').rating = itemData.content.rating;

        if (itemData.content.media.length > 0) {
            for (const [index, url] of itemData.content.media.entries()) { //@ts-ignore
                $item(`#reviewPhoto${index + 1}`).src = url; //@ts-ignore
                $item(`#reviewPhoto${index + 1}`).expand();
            }

            $item('#reviewPhotosBox').expand();
        }
    });

    $w('#editReviewButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentState: "Edit", _currentReview: itemData });
    });

    $w('#deleteReviewButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentReview: itemData });
        openLightbox("AreYouSure")
            .then((answer) => {
                if (answer) {
                    dispatch("deleteReview");
                }
            });
    })
}

// HELPER FUNCTIONS
function updateMenuStatus(itemLabel) {
    const updatedMenuStatus = $w('#reviewsStateMenu').menuItems.map((item) => {
        if (item.label === itemLabel) {
            return {
                ...item,
                selected: true
            }
        } else {
            return {
                ...item,
                selected: false
            }
        }
    });

    $w('#reviewsStateMenu').menuItems = updatedMenuStatus;
}

function validateInputs() {
    const validRating = $w('#reviewRatingInput').valid;
    const validReview = $w('#reviewCommentInput').valid;
    const validImages = $w('#imageUploadInput').valid;

    if (validRating && validReview && validImages) {
        return true;
    } else {
        const validationMessage = $w('#imageUploadInput').validationMessage;

        if (!validImages) {
            for (const [index, key] of Object.keys(validationMessage).entries()) {
                if (validationMessage[key] === true) {
                    let message;

                    switch (key) {
                        case "fileSizeExceedsLimit": {
                            message = "Your file is too large! Please try again with a smaller file. (Max size is 25MB)";
                            break;
                        }
                        case "fileTypeNotAllowed": {
                            message = "Your file type is not allowed! Please try again with a different image files (JPG or PNG suggested).";
                            break;
                        }
                        case "exceedsFileLimit": {
                            message = "You have selected too many images! Please try again with maximum of 3 images.";
                            break;
                        }
                        default: {
                            message = "We couldn't upload your image/s! Please try again.";
                            break;
                        }
                    }

                    $w('#imageUploadInput').reset();
                    dispatch("notify", {
                        message,
                        type: "error"
                    });
                }
            }
        } else {
            dispatch("notify", {
                message: "Review details are not valid!",
                type: "error"
            });
        }

        return false;
    }
}

function clearFields() { //@ts-ignore
    $w('#reviewRatingInput, #reviewCommentInput').value = null; //@ts-ignore
    $w('#reviewRatingInput, #reviewCommentInput').resetValidityIndication();
    $w('#imageUploadInput').reset();
}
