import { lightbox } from 'wix-window-frontend';
import { createStoreon } from 'storeon-velo';
import moment from 'moment';
import { findIndex } from 'lodash';

// Setup store for reviews photo gallery
const reviewsPhotoGalleryStore = (store) => {
    store.on('@init', () => ({}));
}

// Create State
const appState = createStoreon([reviewsPhotoGalleryStore]);
const { getState, setState, dispatch, connect, readyStore } = appState;

$w.onReady(async function () {
    const contextData = lightbox.getContext();
    setupStateEvents();
    setupInitView(contextData);
    return readyStore();
});

function setupInitView(contextData) {
    // Update state
    const { state, itemData } = contextData;
    setState({ _currentReview: itemData, state });
}

function setupStateEvents() {
    setEventListeners();

    connect("_currentReview", ({ _currentReview, state }) => {
        if (_currentReview) {
            $w('#currentImage').src = _currentReview.mediaSrc;

            if ($w('#currentImage').hidden) {
                $w('#currentImage').show();
            }

            $w('#currentRating').rating = _currentReview.content.rating;
            $w('#currentMemberAndDate').html = `<p class="font_7">${_currentReview.memberData.profile.nickname} | <span style="color: #5d5e61">${moment(_currentReview._updatedDate).format('DD MMM YYYY')}</span></p>`;
            $w('#currentReviewComment').text = _currentReview.content.body;
        }
    });

    connect("currentIndex", ({ currentIndex, state }) => {
        if (currentIndex === state._reviewsWithPhotosOnly.length - 1) {
            $w('#nextImage').collapse();
            $w('#previousImage').expand();
        } else if (currentIndex === 0) {
            $w('#previousImage').collapse();
            $w('#nextImage').expand();
        } else {
            $w('#previousImage').expand();
            $w('#nextImage').expand();
        }

        const nextItem = state._reviewsWithPhotosOnly[currentIndex];
        setState({ _currentReview: nextItem });
    })
}

function setEventListeners() {
    //@ts-ignore
    $w('#nextImage, #previousImage').onClick((event) => {
        const { state, _currentReview, } = getState();
        const currentIndex = findIndex(state._reviewsWithPhotosOnly, _currentReview);

        if (event.target.id === "nextImage") {
            setState({ currentIndex: currentIndex + 1 });
        } else if (event.target.id === "previousImage") {
            setState({ currentIndex: currentIndex - 1 });
        }
    });
}

