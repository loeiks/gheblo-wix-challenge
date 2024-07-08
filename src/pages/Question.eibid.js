// Wix API Imports
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { query, to, url, path } from 'wix-location-frontend';
import { authentication, currentMember } from 'wix-members-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import moment from 'moment';
// Public Imports
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
import { _icons_ } from 'public/icons';
// Backend Imports
import { updateQuestion, updateReply, createReply, deleteQuestion, deleteReply } from 'backend/Questions/writes.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const questionStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });
}

// Setup Store Functions
const store = createStoreon([questionStore]);
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
        question,
        product
    } = routerData;

    if (authentication.loggedIn()) {
        setState({ _currentMember: await currentMember.getMember() });
    }

    setState({ question: question[0], product, replies: question[0].replies });

    if (query.edit) {
        setState({ _currentData: getState().question });
        setState({ _currentDataType: "question" });
        setState({ _currentState: "editor" });
    }
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("product", ({ product }) => {
        if (product) {
            $w('#productName').text = product.name;
            $w('#productPrice').text = product.formattedDiscountedPrice;
            $w('#productImage').src = product.mainMedia;
            $w('#productImage').link = product.productPageUrl;
            $w('#productImage').target = "_self";
        }
    })

    connect("_currentMember", ({ _currentMember }) => {
        if (_currentMember) { //@ts-ignore
            $w('#memberProfilePhoto, #editorProfilePhoto').src = _currentMember.profile.profilePhoto?.url || _icons_.profilePhotoNull; //@ts-ignore
            $w('#memberProfilePhoto, #editorProfilePhoto').show();
        }
    });

    connect("replies", ({ replies }) => {
        if (replies) {
            if (replies.length > 0) {
                setState({ noReplies: false });
                $w('#questionRepliesRepeater').data = [];
                $w('#questionRepliesRepeater').data = replies;
                $w('#totalQuestionRepliesText').text = `Replies (${replies.length})`;
            } else {
                setState({ noReplies: true });
            }
        } else {
            setState({ noReplies: true });
        }
    });

    connect("noReplies", ({ noReplies }) => {
        if (noReplies === true) {
            $w('#totalQuestionRepliesText').text = `Replies (0)`;
            $w('#questionRepliesRepeater').collapse();
            $w('#noRepliesText').expand();
        } else {
            $w('#noRepliesText').collapse();
            $w('#questionRepliesRepeater').expand();
        }
    });

    connect("product", ({ product }) => {
        if (product) {
            $w('#productName').text = product.name;
            $w('#productPrice').text = product.formattedDiscountedPrice;
            $w('#productImage').src = product.mainMedia;
            $w('#productImage').link = product.productPageUrl;
            $w('#productImage').target = "_self";
        }
    });

    connect("_currentState", ({ _currentState, _currentData }) => {
        if (_currentState) {
            $w('#stateBox').changeState(_currentState);

            if (_currentState === "editor") {
                $w('#editorTextBox').value = _currentData.text;
                $w('#editorCancel').expand();
            } else {
                $w('#editorCancel').collapse();
            }
        }
    });

    connect("question", "_currentMember", ({ question, _currentMember }) => {
        if (question) {
            const { profile } = question.member.entity;

            $w('#replyQuestionMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
            $w('#replyQuestionMemberUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(question._updatedDate).format('DD MMM YYYY')}</span></p>`;
            $w('#replyQuestionText').text = question.text;

            if (_currentMember?._id === question._owner) {
                $w('#editQuestion').expand();
                $w('#deleteQuestion').expand();
            } else {
                $w('#editQuestion').collapse();
                $w('#deleteQuestion').collapse();
            }

            $w('#questionTitle').text = `${profile.nickname}'s Question`;
        }
    });

    connect("_currentDataType", ({ _currentDataType }) => {
        if (_currentDataType === "question") {
            $w('#editorTitle').text = "Edit Question";
        } else if (_currentDataType === "reply") {
            $w('#editorTitle').text = "Edit Reply";
        }
    });
}

function setEventListeners() {
    $w('#questionRepliesRepeater').onItemReady(($item, itemData, index) => {
        const { _currentMember } = getState();
        const { profile } = itemData.member.entity;

        $item('#replyMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#replyUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        $item('#replyText').text = itemData.text;

        if (_currentMember?._id === itemData._owner) {
            $item('#editReply').expand();
            $item('#deleteReply').expand();
        } else {
            $item('#editReply').collapse();
            $item('#deleteReply').collapse();
        }
    });

    $w('#editorUpdateButton').onClick(handleUpdate);

    $w('#editorCancel').onClick(() => {
        setState({ _currentState: "replies" });
        $w('#editorTextBox').value = null;
        $w('#editorTextBox').resetValidityIndication();
    });

    $w('#editQuestion').onClick(() => {
        setState({ _currentData: getState().question });
        setState({ _currentDataType: "question" });
        setState({ _currentState: "editor" });
    });

    $w('#editReply').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentData: itemData });
        setState({ _currentDataType: "reply" });
        setState({ _currentState: "editor" });
    });

    $w('#sendQuestionReplyButton').onClick(handleReply);

    $w('#deleteQuestion').onClick(async () => {
        const response = await openLightbox("AreYouSure");

        if (response) {
            const { question } = getState();
            dispatch("notify", { message: "Deleting...", type: "standard", timeout: 10000 });
            const isDeleted = await deleteQuestion(question._id);

            if (isDeleted) {
                dispatch("notify", { message: "Question deleted successfully. Redirecting back to questions...", type: "success" });
                to(`https://gheblo.com/questions/${path[0]}`);
            } else {
                dispatch("notify", { message: "Failed to delete question.", type: "error" });
            }
        }
    })

    $w('#deleteReply').onClick(async (event) => {
        const { itemData } = useScope(event);
        const { replies } = getState();
        const response = await openLightbox("AreYouSure");

        if (response) {
            dispatch("notify", { message: "Deleting...", type: "standard", timeout: 10000 });
            const isDeleted = await deleteReply(itemData._id);

            if (isDeleted) {
                dispatch("notify", { message: "Reply deleted successfully.", type: "success" });
                const updatedReplies = replies.filter(r => r._id !== itemData._id);
                setState({ replies: updatedReplies });
            } else {
                dispatch("notify", { message: "Failed to delete reply.", type: "error" });
            }
        }
    });

    //@ts-ignore
    $w('#backToQuestion, #questionTitle').onClick(() => {
        to(`https://www.gheblo.com/questions/${path[0]}`);
    });
}

async function handleUpdate() {
    const { _currentDataType, _currentData, replies, question } = getState();
    const isValid = validateInput();
    if (!isValid) return null;

    $w('#editorUpdateButton').disable();
    $w('#editorUpdateButton').label = "Updating...";

    const text = $w('#editorTextBox').value;
    if (_currentDataType === "question") {
        const updatedQuestion = await updateQuestion(text, _currentData._id);
        if (updatedQuestion) {
            dispatch("notify", { message: "Question updated successfully.", type: "success" });
        } else {
            dispatch("notify", { message: "Failed to update question.", type: "error" });
        }

        setState({ question: { ...question, ...updatedQuestion } });
        setState({ _currentState: "replies" });
    } else if (_currentDataType === "reply") {
        const updatedReply = await updateReply(_currentData._id, text);
        if (updatedReply) {
            dispatch("notify", { message: "Reply updated successfully.", type: "success" });
        } else {
            dispatch("notify", { message: "Failed to update reply.", type: "error" });
        }

        const newReplyData = {
            ...replies.find(r => r._id === updatedReply._id),
            ...updatedReply
        };

        setState({ replies: [...replies.filter(r => r._id !== updatedReply._id), newReplyData] });
        setState({ _currentState: "replies" });
    }

    $w('#editorUpdateButton').label = "Update";
    $w('#editorUpdateButton').enable();
}

async function handleReply() {
    const { question, product, replies } = getState();
    const isValid = validateInput($w('#memberReplyTextBox'));
    if (!isValid) return null;

    $w('#sendQuestionReplyButton').disable();
    $w('#sendQuestionReplyButton').label = "Sending Reply...";

    const createdReply = await createReply(question._id, $w('#memberReplyTextBox').value, product._id);

    if (createdReply) {
        dispatch("notify", { message: "Reply sent successfully. Reloding page...", type: "success" });
        to(url);
    } else {
        dispatch("notify", { message: "Failed to send reply.", type: "error" });
    }

    $w('#sendQuestionReplyButton').label = "Send Reply";
    $w('#sendQuestionReplyButton').enable();
}

function validateInput(element = $w('#editorTextBox')) {
    const value = element.value;
    const isValid = element.valid;

    if (isValid && value) {
        if (value.length > 20) {
            return true;
        } else {
            dispatch("notify", { message: "Text must be at least 20 characters long.", type: "error" });
            return false;
        }
    } else {
        dispatch("notify", { message: "Invalid question/reply.", type: "error" });
        return false;
    }
}