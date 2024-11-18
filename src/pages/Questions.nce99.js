// Wix API Imports
import { getRouterData, openLightbox } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
import { currentMember, authentication } from 'wix-members-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import { debounce } from 'lodash';
// Public Imports
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
import { _icons_ } from 'public/icons';
import moment from 'moment';
// Backend Imports
import { createQuestion, deleteQuestion } from 'backend/Questions/writes.web';
import { getProductQuestions } from 'backend/Questions/query.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const questionsStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    store.on("loadMore", async ({ questions, searchText, product }) => {
        const result = await getProductQuestions(product.slug, 10, 10, searchText);
        const updatedQuestions = questions.concat(result.questions);
        store.set({ questions: updatedQuestions });
        store.set({ hasNext: result.hasNext });
        $w('#loadMoreQuestionsButton').label = "Load More";
    });
}

// Setup Store Functions
const store = createStoreon([questionsStore]);
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

    if (authentication.loggedIn()) {
        setState({ _currentMember: await currentMember.getMember() });
    }

    const {
        questions,
        product,
        hasNext,
        uniqueBuyersCount
    } = routerData;

    setState({ questions, product, hasNext, uniqueBuyersCount });

    if (query["create"]) {
        setState({ _currentState: "createQuestion" });
    }
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("hasNext", ({ hasNext }) => {
        if (hasNext) {
            $w('#loadMoreQuestionsButton').expand();
            $w('#allLoadedText').collapse();
        } else if (hasNext === false) {
            $w('#loadMoreQuestionsButton').collapse();
            $w('#allLoadedText').expand();
        }
    })

    connect("_currentMember", ({ _currentMember }) => {
        if (_currentMember) {
            $w('#memberProfilePhoto').src = _currentMember.profile.profilePhoto?.url || _icons_.profilePhotoNull;
            $w('#memberProfilePhoto').show();
        }
    });

    connect("questions", ({ questions }) => {
        if (questions) {
            if (questions.length > 0) {
                setState({ noQuestions: false });
                $w('#questionsRepeater').data = [];
                $w('#questionsRepeater').data = questions;
            } else {
                setState({ noQuestions: true });
            }
        } else {
            setState({ noQuestions: true });
        }
    });

    connect("noQuestions", ({ noQuestions }) => {
        if (noQuestions === true) {
            $w('#questionsRepeater').collapse();
            $w('#noQuestionsText').expand();
        } else {
            $w('#noQuestionsText').collapse();
            $w('#questionsRepeater').expand();
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

    connect("_currentState", ({ _currentState }) => {
        if (_currentState) {
            $w('#stateBox').changeState(_currentState);

            if (_currentState === "createQuestion") {
                if (authentication.loggedIn()) {
                    $w('#pageTitle').text = "Create Question";
                    $w('#backToQuestions').expand();
                } else {
                    authentication.promptLogin({ modal: true, mode: "signup" });
                }
            } else {
                $w('#pageTitle').text = "Questions";
                $w('#backToQuestions').collapse();
            }
        }
    });

    connect("uniqueBuyersCount", ({ uniqueBuyersCount }) => {
        if (uniqueBuyersCount) {
            if (uniqueBuyersCount > 0) {
                $w('#questionsDescriptionText').text = `${uniqueBuyersCount} members have this product and can help you.`;
            } else {
                $w('#questionsDescriptionText').text = `Ask your question to get answers form other members.`;
            }
        }
    });
}

function setEventListeners() {
    $w('#questionsRepeater').onItemReady(($item, itemData, index) => {
        const { profile } = itemData.member.entity;

        // Question
        $item('#questionMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#questionMemberUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        $item('#questionText').text = itemData.text;

        if (itemData._owner === getState()._currentMember._id) { //@ts-ignore
            $item('#deleteQuestion, #editQuestion').expand();
        }

        // First Reply
        if (itemData.replies.length > 0) {
            const reply = itemData.replies[0];
            const { profile } = reply.member.entity;

            $item('#replyMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
            $item('#replyMemberUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
            $item('#replyText').text = reply.text;

            //@ts-ignore
            $item('#replyIcon, #firstReplyBox').expand();
        }

        $item('#questionRepliesButton').label = `Replies (${itemData.replies.length})`;
    });

    $w('#backToProductIcon').onClick(() => to('/product-page/' + getState().product.slug));
    $w('#createNewQuestionButton').onClick(event => setState({ _currentState: "createQuestion" }));
    $w('#backToQuestions').onClick(event => setState({ _currentState: "questions" }));

    $w('#publishQuestionButton').onClick(async () => {
        $w('#publishQuestionButton').disable();
        $w('#publishQuestionButton').label = "Publishing...";

        const text = $w('#questionTextBox').value;
        const { product } = getState();

        if (text && text.length > 40) {
            const createdQuestion = await createQuestion(text, product._id);

            if (createdQuestion) {
                dispatch("notify", { message: "Your question has been published successfully.", type: "success" });
                to(`https://exweiv.wixstudio.io/gheblo/questions/${product.slug}/${createdQuestion._id}`);
            } else {
                dispatch("notify", { message: "Failed to publish question!", type: "error" });
            }
        }
    });

    $w('#publishQuestionButton').label = "Publish Question";
    $w('#publishQuestionButton').enable();

    $w('#editQuestion').onClick((event) => {
        const { itemData } = useScope(event);
        const { product } = getState();
        to(`https://exweiv.wixstudio.io/gheblo/questions/${product.slug}/${itemData._id}?edit=true`);
    });

    $w('#deleteQuestion').onClick(async (event) => {
        const { itemData } = useScope(event);

        const response = await openLightbox("AreYouSure");
        if (response) {
            const isDeleted = await deleteQuestion(itemData._id);

            if (isDeleted) {
                dispatch("notify", { message: "Your question has been deleted successfully.", type: "success" });
                refreshQuestions(itemData._id);
            } else {
                dispatch("notify", { message: "Failed to delete question!", type: "error" });
            }
        }
    });

    $w('#loadMoreQuestionsButton').onClick(async () => {
        $w('#loadMoreQuestionsButton').label = "Loading...";
        dispatch("loadMore");
    });

    //@ts-ignore
    $w('#questionRepliesButton, #replyToQuestionButton').onClick((event) => {
        const { itemData } = useScope(event);
        const { product } = getState();
        to(`https://exweiv.wixstudio.io/gheblo/questions/${product.slug}/${itemData._id}`)
    });

    $w('#searchInput').onInput(async () => {
        const isValid = $w('#searchInput').value.length > 2;

        if (isValid) {
            setState({ searchText: $w('#searchInput').value });
            searchInQuestions();
        } else {
            const result = await getProductQuestions(getState().product.slug, 0, 10);
            setState({ questions: result.questions });
        }
    });
}

function refreshQuestions(itemId) {
    const { questions } = getState();
    const updatedArr = questions.filter(q => q._id === itemId);
    setState({ questions: updatedArr });
}

const searchInQuestions = debounce(async () => {
    const searchText = $w('#searchInput').value;
    const result = await getProductQuestions(getState().product.slug, 0, 10, searchText);
    setState({ questions: result.questions });
}, 500);