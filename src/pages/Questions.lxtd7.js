// Wix API Imports
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
import { _icons_ } from 'public/icons';
import moment from 'moment';
// Backend Imports
import { deleteQuestion, deleteReply } from 'backend/Questions/writes.web';

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
        questions,
        replies
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);
    setState({ questions, replies, profileData: currentMemberHeaderData.profileData, _currentState: "questions" });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("questions", "replies", ({ questions, replies }) => {
        if (questions?.length > 0) {
            setState({ noQuestions: false });
            $w('#questionsRepeater').data = [];
            $w('#questionsRepeater').data = questions;
        } else {
            setState({ noQuestions: true });
        }

        if (replies?.length > 0) {
            setState({ noReplies: false });
            $w('#repliesRepeater').data = [];
            $w('#repliesRepeater').data = replies;
        } else {
            setState({ noReplies: true });
        }
    });

    connect("noQuestions", "noReplies", ({ noQuestions, noReplies }) => {
        if (noQuestions) {
            $w('#questionsRepeater').collapse();
            $w('#noQuestionsText').expand();
        } else {
            $w('#questionsRepeater').expand();
            $w('#noQuestionsText').collapse();
        }
        if (noReplies) {
            $w('#repliesRepeater').collapse();
            $w('#noRepliesText').expand();
        } else {
            $w('#repliesRepeater').expand();
            $w('#noRepliesText').collapse();
        }
    });

    connect("_currentState", ({ _currentState }) => {
        if (_currentState === "questions") { //@ts-ignore
            $w('#stateTitle, #mobilePageTitle').text = "Questions";
            $w('#stateBox').changeState("questions");
            updateMenuStatus("Questions");
        } else if (_currentState === "replies") { //@ts-ignore
            $w('#stateTitle, #mobilePageTitle').text = "Replies";
            $w('#stateBox').changeState("replies");
            updateMenuStatus("Replies");
        }
    });
}

function setEventListeners() {
    $w('#questionsStateMenu').onItemClick((event) => {
        const itemLabel = event.item.label;
        setState({ _currentState: itemLabel.toLowerCase() });
        updateMenuStatus(itemLabel);
    });

    $w('#questionsRepeater').onItemReady(($item, itemData, index) => {
        const { profile } = getState().profileData;
        $item('#questionMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#questionMemberUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        $item('#questionText').text = itemData.text;
    });

    $w('#repliesRepeater').onItemReady(($item, itemData, index) => {
        const { profile } = getState().profileData;
        $item('#replyMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#replyUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        $item('#replyText').text = itemData.text;
    });

    //@ts-ignore
    $w('#editQuestion, #editReply').onClick(async (event) => {
        const { itemData } = useScope(event);
        const { slug } = itemData.product[0].entity;

        if (event.target.id === "editQuestion") {
            to(`https://exweiv.wixstudio.io/gheblo/questions/${slug}/${itemData._id}?edit=true`);
        } else {
            to(`https://exweiv.wixstudio.io/gheblo/questions/${slug}/${itemData.questionId}?editReply=${itemData._id}`);
        }
    });

    //@ts-ignore
    $w('#replyText, #questionText').onClick((event) => {
        const { itemData } = useScope(event);
        const { slug } = itemData.product[0].entity;
        to(`https://exweiv.wixstudio.io/gheblo/questions/${slug}/${itemData._id}`);
    });

    //@ts-ignore
    $w('#deleteQuestion, #deleteReply').onClick(async (event) => {
        const { itemData } = useScope(event);
        const response = await openLightbox("AreYouSure");

        if (response && event.target.id === "deleteQuestion") {
            const isDeleted = await deleteQuestion(itemData._id);
            if (isDeleted) {
                dispatch("notify", { message: "Question deleted successfully.", type: "success" });
                const updatedArr = getState().questions.filter(question => question._id !== itemData._id);
                setState({ questions: updatedArr });
            } else {
                dispatch("notify", { message: "Failed to delete question!", type: "error" });
            }
        } else if (response && event.target.id === "deleteReply") {
            const isDeleted = await deleteReply(itemData._id);
            if (isDeleted) {
                dispatch("notify", { message: "Reply deleted successfully.", type: "success" });
                const updatedArr = getState().replies.filter(reply => reply._id !== itemData._id);
                setState({ replies: updatedArr });
            } else {
                dispatch("notify", { message: "Failed to delete reply!", type: "error" });
            }
        }
    });
}

// HELPERS
function updateMenuStatus(itemLabel) {
    const updatedMenuStatus = $w('#questionsStateMenu').menuItems.map((item) => {
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

    $w('#questionsStateMenu').menuItems = updatedMenuStatus;
}