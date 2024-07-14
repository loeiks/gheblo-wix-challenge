// Wix API Imports
import { copyToClipboard, getRouterData, openLightbox } from 'wix-window-frontend';
import { query } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
import { createQueue } from 'public/Helpers/queue';
// Backend Imports
import { publishVideo, deleteVideo, updateVideo } from 'backend/Explore/video_actions.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const myAccountStore = (store) => {
    store.on("@init", () => ({
        // 
    }));

    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    // Publish Video
    store.on("publishVideo", async ({ _uploadedVideo, memberVideos }) => {
        try {
            const isValid = validateInputs();

            if (isValid) {
                const productPageUrls = $w('#productLinksInVideo').value;
                const productTitle = $w('#videoTitleInput').value;

                const createdVideo = await publishVideo({
                    title: productTitle,
                    videoUrl: _uploadedVideo.fileUrl,
                    productLinks: productPageUrls
                });

                if (createdVideo) {
                    const updatedVideosList = [...memberVideos, createdVideo];
                    setState({ memberVideos: updatedVideosList });
                    dispatch("notify", { message: "Your video has been published.", type: "success" });

                    clearFields();
                    setState({ _currentState: "view" });
                } else {
                    dispatch("notify", { message: "Failed to publish video!", type: "error" });
                }
            }

            $w('#startUploadingVideoButton').enable();
        } catch (err) {
            console.error(err);
            $w('#startUploadingVideoButton').enable();
            dispatch("notify", { message: "Failed to publish video!", type: "error" });
        }
    });

    store.on("updateVideo", async ({ _currentVideo, memberVideos }) => {
        try {
            const isValid = validateInputs();

            if (isValid) {
                const productPageUrls = $w('#productLinksInVideo').value;
                const productTitle = $w('#videoTitleInput').value;

                const updateData = {
                    videoId: _currentVideo._id,
                    title: productTitle,
                    productLinks: productPageUrls
                }

                const updatedVideo = await updateVideo(updateData);

                if (updatedVideo) {
                    const updatedVideosList = memberVideos.filter((video) => {
                        return video._id !== updatedVideo._id;
                    });

                    setState({ memberVideos: [...updatedVideosList, updatedVideo] });

                    dispatch("notify", { message: "Video details updated.", type: "success" });

                    clearFields();
                    setState({ _currentState: "view" });
                } else {
                    dispatch("notify", { message: "Failed to update video!", type: "error" });
                }
            }
        } catch (err) {
            $w('#startUploadingVideoButton').enable();
            console.error(err);
            dispatch("notify", { message: "Failed to update video!", type: "error" });
        }
    });

    store.on("deleteVideo", async ({ memberVideos }, videoData) => {
        try {
            const isDeleted = await deleteVideo(videoData._id);
            const updatedVideoList = memberVideos.filter((video) => {
                return video._id !== videoData._id;
            });

            if (isDeleted) {
                dispatch("notify", { message: "Your video has been deleted.", type: "success" });
                setState({ memberVideos: updatedVideoList });
                setState({ _currentState: "view" });
            } else {
                dispatch("notify", { message: "Failed to delete video!", type: "error" });
            }
        } catch (err) {
            console.error(err);
            dispatch("notify", { message: "Failed to delete video!", type: "error" });
        }
    });
}

// Setup Store Functions
const store = createStoreon([myAccountStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
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
        memberVideos
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);

    setState({
        memberVideosResponse: memberVideos,
        memberVideos: memberVideos.items,
        _currentState: "view"
    });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("memberVideos", ({ memberVideos }) => {
        if (memberVideos) {
            if (memberVideos.length > 0) {
                setState({ noMemberVideos: false });
                $w('#videosRepeater').data = [];
                $w('#videosRepeater').data = memberVideos;
            } else {
                setState({ noMemberVideos: true });
            }
        } else {
            setState({ noMemberVideos: true });
        }
    });

    connect("noMemberVideos", ({ noMemberVideos }) => {
        if (noMemberVideos === true) {
            $w('#videosRepeater').collapse();
            $w('#noMemberVideos').expand();
        } else {
            $w('#noMemberVideos').collapse();
            $w('#videosRepeater').expand();
        }
    });

    connect("_currentState", ({ _currentState, memberVideosResponse, _currentVideo }) => {
        if (_currentState) {
            if (_currentState === "edit") {  //@ts-ignore
                $w('#searchInVideosInput, #uploadVideoButton, #uploadInputContainer, #actualUploadInput').collapse();
                $w('#stateBox').changeState("editAndCreate"); //@ts-ignore
                $w('#stateTitle, #mobilePageTitle').text = "Edit Video";
                $w('#startUploadingVideoButton').label = "Update Video";

                $w('#videoTitleInput').value = _currentVideo.title;
                $w('#productLinksInVideo').value = _currentVideo.productLinks;
            } else if (_currentState === "create") {
                clearFields(); //@ts-ignore
                $w('#searchInVideosInput, #uploadVideoButton').collapse(); //@ts-ignore
                $w('#uploadInputContainer, #actualUploadInput').expand();
                $w('#stateBox').changeState("editAndCreate"); //@ts-ignore
                $w('#stateTitle, #mobilePageTitle').text = "Create Video";
                $w('#startUploadingVideoButton').label = "Start Uploading Video";
            } else if (_currentState === "view") {  //@ts-ignore
                $w('#searchInVideosInput, #uploadVideoButton').expand();
                $w('#stateBox').changeState("viewAndManage"); //@ts-ignore
                $w('#stateTitle, #mobilePageTitle').text = `Videos (${memberVideosResponse.length})`;
            }
        }
    });

    connect("_uploadedVideo", ({ _uploadedVideo }) => {
        if (_uploadedVideo) {
            $w('#uploadInputStatusText').text = `Uploaded: ${_uploadedVideo.originalFileName}`;
            $w('#startUploadingVideoButton').label = "Publish Uploaded Video";
        }
    });
}

function setEventListeners() {
    $w('#videosRepeater').onItemReady(($item, itemData, index) => {
        $item('#videoPoster').src = itemData.thumbnailUrl;
        $item('#videoPoster').link = `https://www.gheblo.com/explore/${itemData._id}`;
        $item('#videoPoster').target = "_blank";
        $item('#videoTitle').text = itemData.title;
    });

    const queue = createQueue();
    //@ts-ignore
    $w('#videoPoster, #videoActionsStack').onMouseIn((event) => {
        const { $item } = useScope(event);
        queue(() => $item("#videoActionsStack").show());
    });

    //@ts-ignore
    $w('#videoPoster').onMouseOut((event) => {
        const { $item } = useScope(event);
        queue(() => $item("#videoActionsStack").hide());
    });

    $w('#editVideoButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentState: "edit", _currentVideo: itemData });
    });

    $w('#editorCancel').onClick((event) => {
        setState({ _currentState: "view" });
    });

    $w('#startUploadingVideoButton').onClick(async (event) => {
        const { _uploadedStatus, _currentState } = getState();

        if (_uploadedStatus === true && _currentState === "create") {
            $w('#startUploadingVideoButton').disable();
            dispatch("publishVideo");
            return null;
        }

        if (_currentState === "edit") {
            dispatch("updateVideo");
            return null;
        }

        $w('#startUploadingVideoButton').disable();
        $w('#uploadInputStatusText').text = `Uploading...`;
        const uploadedVideo = await $w('#actualUploadInput').uploadFiles();
        const validationMessage = $w('#actualUploadInput').validity;
        const isValid = $w('#actualUploadInput').valid;

        if (!isValid) {
            for (const [index, key] of Object.keys(validationMessage).entries()) {
                if (validationMessage[key] === true) {
                    let message;

                    switch (key) {
                        case "fileSizeExceedsLimit": {
                            message = "Your file is too large! Please try again with a smaller file. (Max size is 4GB)";
                            break;
                        }
                        case "fileNotUploaded": {
                            message = "You didn't select any file, or upload failed! Please try again.";
                            break;
                        }
                        case "fileTypeNotAllowed": {
                            message = "Your file type is not allowed! Please try again with a different video file.";
                            break;
                        }
                        case "exceedsFileLimit": {
                            message = "You have selected too many files! Please try again with a single file.";
                            break;
                        }
                        default: {
                            message = "We couldn't upload your video! Please try again.";
                            break;
                        }
                    }

                    $w('#actualUploadInput').reset();
                    dispatch("notify", { message, type: "error" });
                }
            }
        }

        setState({ _uploadedVideo: uploadedVideo[0], _uploadedStatus: true });
        dispatch("notify", { message: "Your video has been uploaded successfully. You can publish it now.", type: "success" });
        $w('#startUploadingVideoButton').enable();
    });

    $w('#uploadVideoButton').onClick(() => {
        setState({ _currentState: "create" });
    });

    $w('#actualUploadInput').onChange((event) => {
        const { name, size, valid } = $w('#actualUploadInput').value[0];

        if (valid) {
            const mb = bytesToMb(size);
            $w('#uploadInputStatusText').text = `Selected: ${name} (${mb}mb)`;
        }
    });

    $w('#deleteVideoButton').onClick((event) => {
        const { itemData } = useScope(event);

        openLightbox("AreYouSure")
            .then((answer) => {
                if (answer) {
                    dispatch("deleteVideo", itemData);
                }
            });
    });

    $w('#shareVideoURL').onClick((event) => {
        const { itemData } = useScope(event);
        const url = `https://www.gheblo.com/explore/${itemData._id}`;
        copyToClipboard(url);
        dispatch("notify", { message: "Video URL has been copied to your clipboard.", type: "success" });
    })
}

// HELPERS
function extractProductUrls(urlsString) {
    try {
        const urlArray = urlsString.trim().split(/[, ]+/);
        const productUrls = urlArray.map(url => {
            const match = url.match(/\/product-page\/([^/]+)/);
            return match ? `/${match[1]}` : undefined;
        }).filter(item => item !== undefined);
        return productUrls;
    } catch (err) {
        throw new Error(err);
    }
}

function clearFields() { //@ts-ignore
    $w('#videoTitleInput, #productLinksInVideo').value = null; //@ts-ignore
    $w('#videoTitleInput, #productLinksInVideo').resetValidityIndication();
    $w('#actualUploadInput').reset();
    $w('#uploadInputStatusText').text = "Click to Upload a Video";
    setState({ _uploadedVideo: undefined, _uploadedStatus: false });
}

function validateInputs() {
    const validTitle = $w('#videoTitleInput').valid;
    const validLinks = $w('#productLinksInVideo').valid;

    if (validLinks && validTitle) {
        const productPageUrls = $w('#productLinksInVideo').value;
        const slugs = extractProductUrls(productPageUrls);

        if (slugs.length === 0) {
            dispatch("notify", { message: "Product links aren't valid!", type: "error" });
            return false;
        }

        return true;
    } else {
        dispatch("notify", { message: "Video details are not valid!", type: "error" });
        return false;
    }
}

function bytesToMb(bytes) {
    if (bytes === 0) return 0.0;
    const conversionFactor = 1024 * 1024;
    return Math.round(bytes / conversionFactor * 100) / 100;
}