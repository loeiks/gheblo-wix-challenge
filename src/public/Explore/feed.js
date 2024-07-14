import { likeVideo, removeLike } from "backend/Explore/video_stats.web.js";
import { useScope } from "repeater-scope";
import { authentication } from "wix-members-frontend";
import { formFactor, openModal, getBoundingRect, copyToClipboard, openLightbox } from 'wix-window-frontend';
import _ from 'lodash';
import { cart, product } from "wix-stores-frontend";
import { addProductToFavs, removeProductFromFavs } from 'backend/Products/favs.web';
import { saveProductATCStats, saveVideoStats } from 'backend/Explore/video_stats.web';
import { queryVideos } from "backend/Explore/query_videos.web.js";
import { local } from "wix-storage-frontend";
import { _icons_ } from '../icons';
import wixSeoFrontend from "wix-seo-frontend";

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function renderFeed(state, store) {
    setupInitView(state, store);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
async function setupInitView(state, { dispatch, setState, getState, connect }) {
    const result = await getBoundingRect();

    if (formFactor === "Desktop") {
        $w('#contentContainer').customClassList.add("content-container-collapsed");
        setState({ _modalSize: { height: result.document.height - 96, width: result.document.width - 96 } });
    } else {
        setState({ _modalSize: { height: result.document.height - 24, width: result.document.width - 24 } });
    }
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function setupFeedStateEvents(state, store) {
    const { dispatch, setState, getState, connect } = store;
    setEventListeners(state, store);
    videoStatsEvents(store);

    connect("feedVideos", ({ feedVideos }) => {
        if (feedVideos) {
            $w('#exploreFeed').data = [];
            $w('#exploreFeed').data = feedVideos;
            setState({ _loadOn: feedVideos.length - 5 });
        }
    });

    connect("_currentVideoData", async ({ _currentVideoData, _currentVideoPlayer, _loggedIn, _previousVideoData, _previousVideoPlayer, _memberVideoStats }) => {
        if (_currentVideoData && _currentVideoPlayer && _previousVideoData && _previousVideoPlayer && _loggedIn === true) {
            const { _id } = _previousVideoData;
            const previousVideoStats = _memberVideoStats.find(stat => stat.videoId === _id);
            handleVideoStats(store, previousVideoStats);
            _previousVideoPlayer.seek(0);
        }

        if (_currentVideoData && _currentVideoPlayer) {
            setState({ _previousVideoData: _currentVideoData });
            setState({ _previousVideoPlayer: _currentVideoPlayer });
        }

        if (_currentVideoData) {
            wixSeoFrontend.setTitle(`${_currentVideoData.title} | Gheblo Explore`);
        }
    });

    connect("_currentVideoIndex", ({ _currentVideoIndex, _loadOn, _isLoading }) => {
        if (_currentVideoIndex) {
            // If we are at the end of the feed, load more
            if (_currentVideoIndex >= _loadOn) {
                // Wait some for mistakes
                setTimeout(async () => {
                    const currentTotal = $w('#exploreFeed').data.length;
                    const { _currentVideoIndex, totalVideos, _isLoading } = getState();

                    // If we are in the same state load more
                    if (_currentVideoIndex >= _loadOn && !_isLoading && currentTotal < totalVideos) {
                        setState({ _isLoading: true });
                        const { items } = await queryVideos(15);
                        console.log(items, $w('#exploreFeed').data);
                        $w('#exploreFeed').data = [...$w('#exploreFeed').data, ...items];
                        setState({ _loadOn: $w('#exploreFeed').data.length - 5, _isLoading: false });
                    }
                }, 2000);
            }
        }
    });
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setEventListeners(state, store) {
    const { dispatch, setState, getState, connect } = store;

    // Setup video feed repeater
    $w('#exploreFeed').onItemReady(($item, itemData, index) => {
        const videoAuthorData = itemData.memberProfileData[0].entity.profile;

        // Video Details
        $item('#videoPlayer').src = itemData.videoUrl;
        $item('#videoTitle').text = itemData.title;
        $item('#likeCount').text = `${itemData.likes}`;

        // Author Details
        $item('#authorProfilePhoto').src = videoAuthorData.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#authorName').text = videoAuthorData.nickname;

        if (state._loggedIn && itemData.memberVideoStats) {
            if (itemData.memberVideoStats.length > 0) {
                const { liked } = itemData.memberVideoStats[0];

                if (liked) {
                    $item('#likeButton').customClassList.add('video-liked');
                }
            }
        }

        const productsUIData = setProductsInRepeater({ $item, itemData }, store);
        for (const { productBox, productBoxPosition, uiElements, productsBox } of productsUIData) {
            const productData = itemData.products[productBoxPosition - 1].entity;
            const { pname, pphoto, pprice, pfavbutton, patcbutton } = uiElements;

            pname.text = productData.name;
            pprice.text = productData.formattedDiscountedPrice;
            pphoto.src = productData.mainMedia;
            pphoto.link = `https://gheblo.com${productData.productPageUrl}`;
            pphoto.target = "_blank";

            if (!_.isEmpty(productData.productOptions)) {
                patcbutton.label = "Select Options";
            } else {
                patcbutton.label = "Add to Cart";
            }

            if (!getState()._loggedIn) {
                pfavbutton.collapse();
            } else {
                const isProductInFavs = checkIsInFavs(productData._id, { getState });

                if (isProductInFavs) {
                    pfavbutton.customClassList.add("in-favs");
                    pfavbutton.icon = getState().icons._inFavsIcon;
                } else {
                    pfavbutton.customClassList.remove("in-favs");
                    pfavbutton.icon = getState().icons._favIcon;
                }
            }

            productBox.expand();
        }

        $item('#productsRepeaterContainer').expand();
    });

    // Video play button state changes
    $w('#videoToggle').onClick((event) => {
        const { $item } = useScope(event);
        $item('#videoPlayer').togglePlay();
    });

    $w('#videoPlayer').onPlay((event) => {
        const { $item } = useScope(event);
        $item('#videoToggle').icon = state.icons._pauseIcon;
    });

    $w('#videoPlayer').onPause((event) => {
        const { $item } = useScope(event);
        $item('#videoToggle').icon = state.icons._playIcon;
    });

    // Volume Toogle
    $w('#volumeToogle').onClick((event) => {
        const { $item } = useScope(event);

        if ($item('#videoPlayer').isMuted) {
            $item('#videoPlayer').unmute();
            $item('#volumeToogle').icon = state.icons._unmutedIcon;
            local.setItem('isPlayerMuted', 0);
        } else {
            $item('#videoPlayer').mute();
            $item('#volumeToogle').icon = state.icons._mutedIcon;
            local.setItem('isPlayerMuted', 1);
        }
    });

    // Progress Bar of video player
    $w('#videoPlayer').onProgress((event) => {
        const { $item } = useScope(event);
        const playedPercentage = calculatePercentageViewed($item('#videoPlayer').duration, $item('#videoPlayer').currentTime);
        $item('#videoProgressBar').value = playedPercentage;
    });

    // Handle products tab state change in UI
    $w('#productsButton').onClick(async (event) => {
        const { $item, itemData } = useScope(event);

        if ($item('#productsContainer').collapsed) {
            $item('#productsContainer').expand();
            if (formFactor === "Desktop") { $item('#contentContainer').customClassList.remove("content-container-collapsed"); }
        } else {
            if (formFactor === "Desktop") { $item('#contentContainer').customClassList.add("content-container-collapsed"); }
            $item('#productsContainer').collapse();
        }
    });

    $w('#closeProductsInVideoTabButton').onClick((event) => {
        const { $item } = useScope(event);
        if (formFactor === "Desktop") { $item('#contentContainer').customClassList.add("content-container-collapsed"); }
        $item('#productsContainer').collapse();
    });

    // Handle like video button for members only
    $w('#likeButton').onClick((event) => {
        if (state._loggedIn) {
            handleVideoLikeAction(event, store);
        } else {
            authentication.promptLogin({ modal: true, mode: "login" });
        }
    });

    // Play video on viewport change
    $w('#contentContainer').onViewportEnter((event) => {
        const { $item, index, itemData } = useScope(event);

        if (parseFloat(local.getItem("isPlayerMuted")) === 1) {
            $item('#volumeToogle').icon = state.icons._mutedIcon;
            $item('#videoPlayer').mute();
            $item('#videoPlayer').play();
            $item('#videoPlayer').play();
        } else {
            $item('#volumeToogle').icon = state.icons._unmutedIcon;
            $item('#videoPlayer').unmute();
            $item('#videoPlayer').play();
            $item('#videoPlayer').play();
        }

        setState({ _currentVideoData: itemData, _currentVideoIndex: index, _currentVideoPlayer: $item('#videoPlayer') });
    });

    $w('#contentContainer').onViewportLeave((event) => {
        const { $item } = useScope(event);
        $item('#videoPlayer').pause();
    });

    // Handle product button clicks with event contexts and positions
    $w('#p1ViewButton, #p2ViewButton, #p3ViewButton, #p4ViewButton, #p5ViewButton').onClick((event) => {
        const { itemData } = useScope(event);
        const productPosition = extractNumberFromString(event.target.id);
        const productData = itemData.products[productPosition - 1].entity;
        openModal(`https://gheblo.com${productData.productPageUrl}/`, getState()._modalSize);
    });

    // Add to cart
    $w('#p1AtcButton, #p2AtcButton, #p3AtcButton, #p4AtcButton, #p5AtcButton').onClick((event) => {
        const { itemData, $item } = useScope(event);
        const productPosition = extractNumberFromString(event.target.id);
        const productData = itemData.products[productPosition - 1].entity;

        itemData._currentlySelectedProduct = productData;

        if (!_.isEmpty(productData.productOptions)) {
            // Has some options
            if (productData.productOptions["Size"]) {
                $item('#selectProductSize').options = productData.productOptions["Size"].choices.map((size) => {
                    return {
                        ...size,
                        label: size.value
                    }
                });

                $item('#selectProductSize').resetValidityIndication();
                $item('#selectProductSize').expand();

                itemData._hasSize = true;
            }

            if (productData.productOptions["Color"]) {
                $item('#selectProductColor').options = productData.productOptions["Color"].choices.map((color) => {
                    return {
                        ...color,
                        label: color.description
                    }
                });

                $item('#selectProductColor').resetValidityIndication();
                $item('#selectProductColor').expand();

                itemData._hasColor = true;
            }

            $item('#selectionTagsStack').expand();
        } else {
            try {
                cart.addProducts([{
                    productId: productData._id,
                    quantity: 1,
                }]).then(() => {
                    dispatch("notify", { message: `${productData.name} added to your cart.`, type: "success" });
                });
            } catch (err) {
                console.error(err);
                dispatch("notify", { message: `${productData.name} couldn't added to your cart!`, type: "error" });
            }
        }
    });

    // Add to favs (member only)
    $w('#p1FavButton, #p2FavButton, #p3FavButton, #p4FavButton, #p5FavButton').onClick(async (event) => {
        const { itemData, $item } = useScope(event);
        const productPosition = extractNumberFromString(event.target.id);
        const productData = itemData.products[productPosition - 1].entity;
        const targetButton = $item(`#${event.target.id}`);

        if (getState()._loggedIn) {
            const isProductInFavsR = checkIsInFavs(productData._id, { getState });

            try {
                if (!isProductInFavsR) {
                    setState({ _isProductInFavs: true });
                    dispatch("handleFavButtonStatus", { targetButton, productId: productData._id });

                    targetButton.disable();
                    const response = await addProductToFavs(productData._id);

                    if (!response) {
                        dispatch("notify", { message: "You couldn't add product to your favorites!", type: "error" });
                        setState({ _isProductInFavs: false });
                        dispatch("handleFavButtonStatus", { targetButton, productId: productData._id });
                    } else {
                        dispatch("notify", { message: "You have added product to your favorites.", type: "success" });
                    }
                } else {
                    targetButton.disable();
                    const response = await removeProductFromFavs(productData._id);

                    if (!response) {
                        dispatch("notify", { message: "You couldn't remove product from your favorites!", type: "error" });
                        setState({ _isProductInFavs: true });
                        dispatch("handleFavButtonStatus", { targetButton, productId: productData._id });
                    } else {
                        dispatch("notify", { message: "You have removed product from your favorites.", type: "success" });
                        setState({ _isProductInFavs: false });
                        dispatch("handleFavButtonStatus", { targetButton, productId: productData._id });
                    }
                }

                const { _isProductInFavs } = getState();
                if (_isProductInFavs !== isProductInFavsR) {
                    refreshFavStatuses(store, productData._id);
                }

                targetButton.enable();
            } catch (err) {
                dispatch("notify", { message: "Unknown error occurred!", type: "error" });
                setState({ _isProductInFavs: !isProductInFavsR });
                dispatch("handleFavButtonStatus", { targetButton, productId: productData._id });
            }
        }
    });

    $w('#addToCartButton').onClick(async (event) => {
        try {
            event.target.disable();
            const { itemData, $item } = useScope(event);
            const productData = itemData._currentlySelectedProduct;

            const selectedSize = $item('#selectProductSize').value[0];
            const selectedColor = $item('#selectProductColor').value[0];

            // Value validty check
            if (itemData._hasSize && !selectedSize) {
                event.target.enable();
                dispatch("notify", { message: `You have to pick a size first!`, type: "warning" });
                return null;
            } else {
                if (itemData._hasColor && !selectedColor) {
                    event.target.enable();
                    dispatch("notify", { message: `You have to pick a color first!`, type: "warning" });
                    return null;
                }
            }

            let choices = {};
            if (itemData._hasSize && selectedSize) {
                choices["Size"] = selectedSize;
            }

            if (itemData._hasColor && selectedColor) {
                choices["Color"] = selectedColor;
            }

            const inStock = await checkVariantStockStatus(productData._id, choices);

            if (!inStock) {
                dispatch("notify", { message: "Product options are not available (out of stock) 😞", type: "warning" });
                event.target.enable();
                return null;
            }

            $item('#selectionTagsStack, #selectProductColor, #selectProductSize').collapse();

            cart.addProducts([{
                productId: productData._id,
                quantity: 1,
                options: { choices }
            }]).then(() => {
                dispatch("notify", { message: `${productData.name} added to cart.`, type: "success" });
                event.target.enable();

                // Save action also in stats
                handleProductATCStat(store, itemData._id, productData._id);
            });
        } catch (err) {
            dispatch("notify", { message: "An unknown error occurred!", type: "error" });
            event.target.enable();
        }
    });

    $w('#selectProductSize, #selectProductColor').onChange((event) => {
        const { $item } = useScope(event);
        const latestSelectedOption = $item(`#${event.target.id}`).value[$item(`#${event.target.id}`).value.length - 1];
        $item(`#${event.target.id}`).value = [latestSelectedOption];
    });

    $w('#viewMyCart').onClick(() => {
        openLightbox("CustomCart");
    });

    $w('#shareVideoURL').onClick((event) => {
        const { itemData } = useScope(event);
        copyToClipboard(`https://www.gheblo.com/explore/${itemData._id}`);
        dispatch("notify", { message: "Video URL Copied to Clipboard" });
    });

    $w('#videoToggleHitBox').onClick((event) => {
        const { $item } = useScope(event);
        $item('#videoPlayer').togglePlay();
    });
}

// HELPER FUNCTIONS
/**
 * @param {number} duration - The total duration in seconds.
 * @param {number} currentTime - The current time in seconds.
 * @returns {number} - The percentage of the duration viewed.
 */
function calculatePercentageViewed(duration, currentTime) {
    if (duration <= 0) {
        throw new Error("Duration must be greater than zero.");
    }
    if (currentTime < 0) {
        throw new Error("Current time cannot be negative.");
    }
    if (currentTime > duration) {
        currentTime = duration;  // Cap currentTime to duration if it exceeds
    }

    const percentageViewed = (currentTime / duration) * 100;
    return percentageViewed;
}

async function handleVideoLikeAction(event, store) {
    const { dispatch } = store;
    const { itemData, $item, index } = useScope(event);

    if (!itemData.memberVideoStats) {
        try {
            $item('#likeButton').customClassList.add('video-liked');
            // Add Like
            const response = await likeVideo(itemData._id);
            if (!response) {
                $item('#likeButton').customClassList.remove('video-liked');
                dispatch('notify', {
                    message: "Unable to like the video!",
                    type: "error"
                });
            } else {
                updateVideoData(index, { memberVideoStats: [response], likes: itemData.likes + 1 });
                $item('#likeCount').text = `${itemData.likes + 1}`;
            }
        } catch (err) {
            dispatch('notify', {
                message: "Unknown error occurred!",
                type: "error"
            });
        }

        return null;
    };

    try {
        if (itemData.memberVideoStats.length > 0) {
            if (itemData.memberVideoStats[0].liked) {
                $item('#likeButton').customClassList.remove('video-liked');
                // Remove Like
                const response = await removeLike(itemData._id);
                if (!response) {
                    $item('#likeButton').customClassList.add('video-liked');
                    dispatch('notify', {
                        message: "Unable to remove like from the video!",
                        type: "error"
                    });
                } else {
                    updateVideoData(index, { memberVideoStats: [response], likes: itemData.likes - 1 });
                    $item('#likeCount').text = `${itemData.likes - 1}`;
                }
            } else {
                $item('#likeButton').customClassList.add('video-liked');
                // Add Like
                const response = await likeVideo(itemData._id);
                if (!response) {
                    $item('#likeButton').customClassList.remove('video-liked');
                    dispatch('notify', {
                        message: "Unable to like the video!",
                        type: "error"
                    });
                } else {
                    updateVideoData(index, { memberVideoStats: [response], likes: itemData.likes + 1 });
                    $item('#likeCount').text = `${itemData.likes + 1}`;
                }
            }
        } else {
            $item('#likeButton').customClassList.add('video-liked');
            // Add Like
            const response = await likeVideo(itemData._id);
            if (!response) {
                $item('#likeButton').customClassList.remove('video-liked');
                dispatch('notify', {
                    message: "Unable to like the video!",
                    type: "error"
                });
            } else {
                updateVideoData(index, { memberVideoStats: [response], likes: itemData.likes + 1 });
                $item('#likeCount').text = `${itemData.likes + 1}`;
            }
        }
    } catch (err) {
        dispatch('notify', {
            message: "Unknown error occurred!",
            type: "error"
        });
    }
}

function updateVideoData(index, updatedProperties, arr = $w('#exploreFeed').data) {
    if (index >= 0 && index < arr.length) {
        const updatedItem = _.assign({}, arr[index], updatedProperties);
        const newArr = [...arr.slice(0, index), updatedItem, ...arr.slice(index + 1)];
        $w('#exploreFeed').data = newArr;
    }
}

/** 
 * @typedef {{
 * patcbutton: $w.Button,
 * pfavbutton: $w.Button,
 * pname: $w.Text,
 * pphoto: $w.Image,
 * pprice: $w.Text,
 * pviewbutton: $w.Button
 * }} UIElementInProductBox
 * 
 * @typedef {{
 * productBox: $w.Container,
 * productBoxPosition: number,
 * enabled?: boolean
 * }} ProductElement
 */

/**
 * @returns {Array<{uiElements: UIElementInProductBox, productsBox: $w.Container} & ProductElement>}
 */
function setProductsInRepeater({ $item, itemData }, store) {
    /**@type {$w.Container} */
    const productsBox = $item('#productsRepeaterContainer');

    /**
     * Set manual repeater elements from container children elements
     * 
     * @param {productElements} productElements
     * @type {{
     * productBox: $w.Container,
     * productBoxPosition: number,
     * enabled?: boolean
     * }[]}
     */
    let productElements = productsBox.children.map((item) => {
        let productBoxPosition = parseFloat(item.id.replace("product", "").replace("Box", ""));

        return {
            productBox: $item(`#${item.id}`),
            productBoxPosition
        };
    });

    // Filter out the containers that is not enabled based on the product count
    const productsInVideo = itemData["products"];
    for (let i = 0; i < productsInVideo.length; i++) {
        const productElement = productElements.find((j) => j.productBoxPosition === i + 1);
        productElement.enabled = true;
    }

    productElements = productElements.filter((elem) => elem.enabled);
    let productsUIData = [];

    for (const productUI of productElements) {
        /**
        * @type {UIElementInProductBox}
        */
        const uiElements = Object();

        for (const uiElement of productUI.productBox.children) {
            if (uiElement.children) {
                for (const innerUIElement of uiElement.children) {
                    uiElements[innerUIElement.id.replace(`${productUI.productBoxPosition}`, "").toLowerCase()] = innerUIElement;
                }
            } else {
                uiElements[uiElement.id.replace(`${productUI.productBoxPosition}`, "").toLowerCase()] = uiElement;
            }
        }

        productsUIData.push({
            ...productUI,
            uiElements,
            productsBox
        });
    }

    return productsUIData;
}

function extractNumberFromString(str) {
    const matched = str.match(/\d+/);
    return matched ? Number(matched[0]) : null;
}

async function checkVariantStockStatus(productId, choices) {
    try {
        const response = await product.getOptionsAvailability(productId, choices);
        return response.availableForPurchase;
    } catch (err) {
        console.error(err);
    }
}

function checkIsInFavs(productId, { getState }) {
    try {
        const { _productFavs } = getState();
        return _productFavs.includes(productId);
    } catch (err) {
        console.error(err);
    }
}

function refreshFavStatuses(store, productId) {
    const { getState } = store;

    const repeaterItemsToUpdate = $w('#exploreFeed').data.filter((itemData) => {
        return itemData.productIds.includes(productId);
    }).map(itemData => itemData._id);

    $w('#exploreFeed').forItems(repeaterItemsToUpdate, ($item, itemData, index) => {
        const productsUIData = setProductsInRepeater({ $item, itemData }, store);
        for (const { productBoxPosition, uiElements } of productsUIData) {
            const productData = itemData.products[productBoxPosition - 1].entity;
            const { pfavbutton } = uiElements;

            if (!getState()._loggedIn) {
                pfavbutton.collapse();
            } else {
                const isProductInFavs = checkIsInFavs(productData._id, { getState });

                if (isProductInFavs) {
                    pfavbutton.customClassList.add("in-favs");
                    pfavbutton.icon = getState().icons._inFavsIcon;
                } else {
                    pfavbutton.customClassList.remove("in-favs");
                    pfavbutton.icon = getState().icons._favIcon;
                }
            }
        }
    });
}

// Video Stats
function videoStatsEvents(store) {
    if (!authentication.loggedIn()) return null;
    const { dispatch, setState, getState, connect } = store;

    // Save watchtime + views when video is playing
    $w('#videoPlayer').onProgress((event) => {
        const { itemData, $item } = useScope(event);
        const currentTime = $item("#videoPlayer").currentTime;

        const { _memberVideoStats } = getState();
        const previousData = _memberVideoStats.find(stat => stat.videoId === itemData._id);
        const filteredStats = _memberVideoStats.filter(stat => stat.videoId !== itemData._id);

        setState({
            _memberVideoStats: [...filteredStats, {
                videoId: itemData._id,
                watchtime: currentTime > previousData?.watchtime || 0 > currentTime ? currentTime : previousData?.watchtime || 0,
                save: currentTime > previousData?.watchtime || 0 > currentTime ? true : false
            }]
        });
    });
}

async function handleProductATCStat(store, videoId, productId) {
    if (!authentication.loggedIn()) return null;
    const { dispatch, setState, getState, connect } = store;

    const { _memberVideoStatsProductATC } = getState();
    const currentData = _memberVideoStatsProductATC.find(stat => stat.videoId === videoId);

    // If marked as not to save we will stop the function
    if (currentData?.save === false) return null;

    // Save data
    const response = await saveProductATCStats(videoId, productId);
    if (!response) {
        // Try again to save after 2 seconds (failover timeout)
        setTimeout(() => { saveProductATCStats(videoId, productId); }, 2000);
    }

    // Mark as not to save in that session
    const filteredStats = _memberVideoStatsProductATC.filter(stat => stat.videoId !== videoId);
    setState({
        _memberVideoStatsProductATC: [...filteredStats, {
            videoId,
            save: false
        }]
    });
}

async function handleVideoStats(store, previousVideoStats) {
    if (!authentication.loggedIn()) return null;
    const { dispatch, setState, getState, connect } = store;

    // If marked as not to save we will stop the function
    if (previousVideoStats?.save === false) return null;
    const { videoId, watchtime } = previousVideoStats;

    const response = await saveVideoStats(videoId, watchtime);
    if (!response) {
        // Try again to save after 2 seconds (failover timeout)
        setTimeout(() => { saveVideoStats(videoId, watchtime); }, 2000);
    }

    // Mark as not to save in that session
    const { _memberVideoStats } = getState();
    const filteredStats = _memberVideoStats.filter(stat => stat.videoId !== videoId);
    setState({
        _memberVideoStats: [...filteredStats, {
            ...previousVideoStats,
            save: false
        }]
    });
}