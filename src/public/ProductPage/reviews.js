import moment from "moment";
import { useScope } from "repeater-scope";
import { formFactor, openLightbox } from 'wix-window-frontend';
import { v4 as uuidv4 } from 'uuid';
import { _icons_ } from '../icons';

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function renderReviews(state, store) {
    setupInitView(state, store);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setupInitView(state, store) {
    const { dispatch, setState, getState, connect } = store;
    const { mainMedia, name, formattedDiscountedPrice } = getState();

    $w('#productMainImage').src = mainMedia;
    $w('#productNameInReviews').text = name;
    $w('#productPriceInReviews').text = formattedDiscountedPrice;
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function setupReviewsStateEvents(state, store) {
    const { dispatch, setState, getState, connect } = store;
    setEventListeners(state, store);

    connect("_productRatings", ({ _productRatings }) => {
        if (_productRatings) {
            $w('#reviewsAvgRating, #reviewsAvgRatingInExpanded').rating = _productRatings.avgRating;
            $w('#totalNumberOfRatings, #totalRatingsInExpanded').text = `${_productRatings.totalRatings} Ratings`;
            $w('#totalNumberOfReviews, #totalReviewsInExpanded').text = `${_productRatings.totalReviews} Reviews`;
            $w("#allReviewsText").text = `All Reviews (${_productRatings.totalReviews})`;
        }
    });

    connect("_reviewsWithComments", ({ _reviewsWithComments }) => {
        if (!_reviewsWithComments) return null;

        if (_reviewsWithComments.length > 0) {
            // For the preview section show only first 4 reviews. For rest attach all of them.
            $w('#reviewsOverviewRepeater').data = _reviewsWithComments.slice(0, 4);
            $w('#allReviewsRepeater').data = _reviewsWithComments;
            $w('#reviewsOverviewRepeater, #allReviewsRepeater').expand();
        } else {
            $w('#reviewsOverviewRepeater, #allReviewsRepeater').collapse();
        }
    })

    connect("_productReviews", ({ _productReviews }) => {
        if (_productReviews?.length > 0) {
            $w('#reviewsSection').restore();

            // Save reviews with comments only
            const reviewsWithComments = _productReviews.filter(review => review.content.body);
            setState({ _reviewsWithComments: reviewsWithComments });

            // Run the photos slider update
            const _reviewsWithPhotosOnly = _productReviews.filter((review) => {
                if (review.content.media) {
                    return review.content.media.length > 0;
                } else {
                    return false;
                }
            })

            // Setup repeaters for photo only reviews
            let photosSliderData = new Array();
            for (const review of _reviewsWithPhotosOnly) {
                for (const mediaSrc of review.content.media) {
                    photosSliderData.push({
                        ...review,
                        reviewId: review._id,
                        _id: uuidv4(),
                        mediaSrc
                    });
                }
            }

            setState({ _reviewsWithPhotosOnly: photosSliderData });
        } else {
            $w('#reviewsSection').delete();
        }
    });

    connect("_reviewsWithPhotosOnly", ({ _reviewsWithPhotosOnly }) => {
        if (_reviewsWithPhotosOnly?.length > 0) {
            // Mark that there are photos in the reviews
            setState({ _reviewsHasPhotos: true });
            // Pass data that only has photos
            $w('#reviewsPhosoSliderRepeater, #reviewPhotosSliderRepeater').data = _reviewsWithPhotosOnly;
        } else {
            setState({ _reviewsHasPhotos: false });
        }
    });

    connect("_reviewsHasPhotos", ({ _reviewsHasPhotos }) => {
        if (_reviewsHasPhotos) {
            $w('#reviewPhotosBoxInExpanded, #reviewPhotosSliderRepeaterBox').restore();
            $w('#reviewPhotosBoxInExpanded, #reviewPhotosSliderRepeaterBox').expand();
        } else {
            $w('#reviewPhotosBoxInExpanded, #reviewPhotosSliderRepeaterBox').collapse();
            $w('#reviewPhotosBoxInExpanded, #reviewPhotosSliderRepeaterBox').delete();
        }
    });

    connect("_currentReviewsViewSection", ({ _currentReviewsViewSection, noQuestions }) => {
        if (_currentReviewsViewSection) {
            handleReviewsView(_currentReviewsViewSection, noQuestions);
        }
    });

    connect("_totalProductReviews", "_reviewsWithComments", ({ _reviewsWithComments }) => {
        if (_reviewsWithComments?.length > 4) {
            $w('#seeMoreReviewsButton').expand();
        } else {
            $w('#seeMoreReviewsButton').collapse();
        }
    });
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setEventListeners(state, store) {
    const { dispatch, setState, getState, connect } = store;

    // Setup photo only reviews repeaters
    $w('#reviewsPhosoSliderRepeater').onItemReady(($item, itemData, index) => {
        $item('#reviewsPhotoInSlider').src = itemData.mediaSrc;
    })

    $w('#reviewPhotosSliderRepeater').onItemReady(($item, itemData, index) => {
        $item("#reviewPhotoInExpanded").src = itemData.mediaSrc;
    });

    // Setup first repeater of general reviews overview
    $w('#reviewsOverviewRepeater').onItemReady(($item, itemData, index) => {
        setupReviewMemberData(itemData, {
            profilePhotoElement: $item('#reviewMemberProfilePhoto'),
            usernameDateElement: $item('#reviewMemberUsernameAndDate'),
            ratingElement: $item('#reviewRating'),
            reviewCommentElement: $item('#reviewComment')
        });

        const photos = checkIfReviewHasPhotos(itemData);
        renderPhotosInReviewItem(photos, {
            photo0: $item('#reviewPhoto1'),
            photo1: $item('#reviewPhoto2'),
            photo2: $item('#reviewPhoto3')
        }, $item('#reviewPhotosBox'));
    });

    $w('#allReviewsRepeater').onItemReady(($item, itemData, index) => {
        setupReviewMemberData(itemData, {
            profilePhotoElement: $item('#reviewMemberProfilePhotoInExpanded'),
            usernameDateElement: $item('#reviewMemberUsernameAndDateInExpanded'),
            ratingElement: $item('#reviewCommentInExpanded'),
            reviewCommentElement: $item('#reviewComment')
        });

        const photos = checkIfReviewHasPhotos(itemData);
        renderPhotosInReviewItem(photos, {
            photo0: $item('#reviewPhoto1InExpanded'),
            photo1: $item('#reviewPhoto2InExpanded'),
            photo2: $item('#reviewPhoto3InExpanded')
        }, $item('#reviewPhotosPreviewInExpanded'));
    })

    // Handle load more on general overview repeater (switch to all reviews section)
    $w('#seeMoreReviewsButton').onClick(() => {
        setState({ _currentReviewsViewSection: "expanded" });
    });

    $w('#collapseExpandedReviewSectionButton').onClick(() => {
        setState({ _currentReviewsViewSection: "preview" });
    });

    // Handle photo click on review
    $w('#photoItemBoxOverview, #photoItemBoxExpanded').onClick((event) => {
        const { itemData } = useScope(event);
        // Open Lightbox
        openLightbox("ReviewsPhotosExplore", { state: getState(), itemData });
    });

    // Just to enable cursor
    $w('#reviewPhotosBox').onClick(() => { });
    $w('#reviewPhoto1, #reviewPhoto2, #reviewPhoto3').onClick((event) => {
        const { itemData } = useScope(event);
        const { _reviewsWithPhotosOnly } = getState();
        const photoData =
            _reviewsWithPhotosOnly.filter(review => review.reviewId === itemData._id)
            [event.target.id.endsWith("1") ? 0 : event.target.id.endsWith("2") ? 1 : 2];

        // Open Lightbox
        openLightbox("ReviewsPhotosExplore", { state: getState(), itemData: photoData });
    });
}

// HELPER FUNCTIONS
function setupReviewMemberData(itemData, {
    profilePhotoElement,
    usernameDateElement,
    ratingElement,
    reviewCommentElement
}) {
    profilePhotoElement.src = itemData.memberData.profile.profilePhoto?.url || _icons_.profilePhotoNull;
    usernameDateElement.html = `<p class="font_7">${itemData.memberData.profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
    ratingElement.rating = itemData.content.rating;
    reviewCommentElement.text = itemData.content.body || "No review comment.";
}

function checkIfReviewHasPhotos(itemData) {
    if (itemData.content.media) {
        if (itemData.content.media.length > 0) {
            return itemData.content.media;
        } else {
            return [];
        }
    } else {
        return [];
    }
}

function renderPhotosInReviewItem(photos, photoElements, photosBoxElement) {
    if (photos.length > 0) {
        for (const [index, photo] of photos.entries()) {
            photoElements[`photo${index}`].src = photo;
            photoElements[`photo${index}`].expand();
        }

        photosBoxElement.expand();
    }
}

function handleReviewsView(view, noQuestions) {
    if (formFactor === ("Desktop" || "Tablet")) {
        // Render for desktop and tablet
        if (view === "expanded") {
            $w('#header, #footer, #desktopMainSection, #reviewsSection, #discussionsSection, #emptyQuestionStateSection, #completeYourLookSection').collapse();
            $w('#reviewsExpandedSection').expand();
            $w('#reviewsExpandedSection').scrollTo();
        } else if (view === "preview") {
            $w('#reviewsExpandedSection').collapse();
            $w('#header, #footer, #desktopMainSection, #reviewsSection, #discussionsSection, #completeYourLookSection').expand();
            if (noQuestions) { $w('#emptyQuestionStateSection').expand() };
        }
    } else {
        // Render for mobile
        if (view === "expanded") {
            $w('#header, #footer, #mobileImagesSection, #mobileInfoSection, #discussionsSection, #reviewsSection, #emptyQuestionStateSection, #completeYourLookSection').collapse();
            $w('#reviewsExpandedSection').expand();
            $w('#reviewsExpandedSection').scrollTo();
        } else if (view === "preview") {
            $w('#reviewsExpandedSection').collapse();
            $w('#header, #footer, #mobileImagesSection, #mobileInfoSection, #discussionsSection, #reviewsSection, #completeYourLookSection').expand();
            if (noQuestions) { $w('#emptyQuestionStateSection').expand() };
        }
    }
}