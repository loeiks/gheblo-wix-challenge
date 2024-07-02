import { createDiscussion, addReplyToDiscussion, queryProductDiscussions } from 'backend/Discussions/discussions.web';
import { getCurrentMemberProfileData } from 'backend/Members/member_data.web';
import moment from 'moment';
import { isEmpty, remove } from 'lodash'
import { useScope } from 'repeater-scope';
import { authentication } from 'wix-members-frontend';
import { getUniqueBuyersCountForThisProduct } from 'backend/Helpers/product_helpers.web';

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function renderDiscussions(state, store) {
    setupInitView(state, store);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setupInitView(state, { dispatch, setState, getState, connect }) {
    // Start repeaters empty
    $w('#discussionsRepeater').data = [];
    $w('#questionRepliesRepeater').data = [];

    setDescription(getState, setState);
    handleCurrentMemberProfilePhoto(getState, setState);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function setupDiscussionsStateEvents(state, store) {
    const { dispatch, setState, getState, connect } = store;
    setEventListeners(state, store);

    connect("_discussionsDescription", ({ _discussionsDescription }) => {
        $w('#discussionDescriptionText').text = _discussionsDescription;
    });

    connect("_productDiscussions", ({ _productDiscussions }) => {
        if (_productDiscussions) {
            $w('#discussionsRepeater').data = [];
            $w('#discussionsRepeater').data = _productDiscussions;
        }
    });

    connect("_currentDiscussionState", ({ _currentDiscussionState }) => {
        if (_currentDiscussionState) {
            setState({ _previousDiscussionState: $w('#discussionsStateBox').currentState.id });
            $w('#discussionsStateBox').changeState(_currentDiscussionState);

            if (_currentDiscussionState === "replies") {
                $w('#discussionsTitleText').text = "Replies of Discussion";
            } else if (_currentDiscussionState === "createQuestion") {
                $w('#discussionsTitleText').text = "Create Discussion";
            } else {
                $w('#discussionsTitleText').text = "Discussions";
            }
        }
    });

    connect("_previousDiscussionState", ({ _previousDiscussionState }) => {
        if (_previousDiscussionState === "replies") {
            $w('#backToPreviousTab').label = "Go back to Replies of Discussion";
        } else if (_previousDiscussionState === "createQuestion") {
            $w('#backToPreviousTab').label = "Go back to Create Discussion";
        } else if (_previousDiscussionState === "discussions") {
            $w('#backToPreviousTab').label = "Go back to Discussions";
        }

        if (_previousDiscussionState) {
            $w('#backToPreviousTab').expand();
        }
    });

    connect("_selectedDiscussionData", ({ _selectedDiscussionData }) => {
        if (_selectedDiscussionData) {
            setupComment({
                profilePhotoElement: $w('#replyQuestionMemberProfilePhoto'),
                usernameAndDateElement: $w('#replyQuestionMemberUsernameAndDate'),
                textElement: $w('#replyQuestionText')
            }, _selectedDiscussionData);

            $w('#totalQuestionRepliesText').text = `Other Replies  (${_selectedDiscussionData.replies.length})`;
            if (_selectedDiscussionData.replies.length > 0) {
                $w('#questionRepliesRepeater').data = _selectedDiscussionData.replies;

                $w('#noRepliesText').collapse();
                $w('#questionRepliesRepeater').expand();
            } else {
                $w('#questionRepliesRepeater').collapse();
                $w('#noRepliesText').expand();
            }
        }
    });

    connect("_currentMemberData", ({ _currentMemberData }) => {
        if (_currentMemberData) {
            $w('#memberProfilePhoto, #memberProfilePhoto1').src = _currentMemberData.profile.profilePhoto.url;
            $w('#memberProfilePhoto, #memberProfilePhoto1').show();
        }
    });
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setEventListeners(state, { dispatch, setState, getState, connect }) {
    // Setup all comments and replies repeater
    $w('#discussionsRepeater').onItemReady(($item, itemData, index) => {
        setupComment({
            profilePhotoElement: $item('#questionMemberProfilePhoto'),
            usernameAndDateElement: $item('#questionMemberNameAndDate'),
            textElement: $item('#questionText')
        }, itemData);

        if (!isEmpty(itemData.replies)) {
            $item('#firstReplyBox, #replyIcon, #questionRepliesButton').restore();
            $item('#firstReplyBox, #replyIcon, #questionRepliesButton').expand();

            const replyItemData = itemData.replies[0];
            $item('#questionRepliesButton').label = `${itemData.replies.length} Replies`;

            setupComment({
                profilePhotoElement: $item('#replyMemberProfilePhoto'),
                usernameAndDateElement: $item('#replyMemberUsernameAndDate'),
                textElement: $item('#replyText')
            }, replyItemData);
        } else {
            $item('#firstReplyBox, #replyIcon, #questionRepliesButton').delete();
        }
    });

    // Handle replies state change
    $w('#questionRepliesButton, #replyToQuestionButton').onClick((event) => {
        const { $item, itemData } = useScope(event);

        if (authentication.loggedIn) {
            // Update selected data
            setState({ _selectedDiscussionData: itemData });
            setState({ _currentDiscussionState: "replies" });
        } else {
            dispatch("showLoginScreen");
        }

        if (event.target.id === "replyToQuestionButton") {
            $w('#discussionsTitleText').scrollTo();
        } else {
            $w('#totalQuestionRepliesText').scrollTo();
        }
    });

    // Setup replies repeater when a discussion selected
    $w('#questionRepliesRepeater').onItemReady(($item, itemData, index) => {
        setupComment({
            profilePhotoElement: $item('#questionReplyMemberProfilePhoto'),
            usernameAndDateElement: $item('#questionReplyUsernameAndDate'),
            textElement: $item('#questionReplyText')
        }, itemData);
    });

    // Setup go back button for states
    $w('#backToPreviousTab').onClick(() => {
        const { _previousDiscussionState } = getState();
        setState({ _currentDiscussionState: _previousDiscussionState });
    });

    // Setup new discussion creation flow
    $w('#createNewQuestion').onClick(() => {
        setState({ _currentDiscussionState: "createQuestion" });
        $w('#discussionsTitleText').scrollTo();
    });

    // Setup send/add reply
    $w('#sendQuestionReply').onClick(() => {
        const replyText = $w('#memberReplyTextBox').value;
        const isValid = $w('#memberReplyTextBox').valid;

        if (isValid) {
            if (replyText.length > 40) {
                handleReplyAction({ getState, dispatch, setState }, replyText);
            } else {
                dispatch("notify", {
                    message: "Your reply must be longer than 40 characters!",
                    type: "warning"
                });
            }
        } else {
            dispatch("notify", {
                message: "Your reply is not valid!",
                type: "error"
            });
        }
    });

    // Load more comments/discussions
    $w('#loadMoreQuestions').onClick(() => {
        handleLoadMore({ getState, setState });
    });

    // Create new discussion
    $w('#publishQuestionButton').onClick(() => {
        const discussionQuestionText = $w('#questionTextBox').value;
        const isValid = $w('#questionTextBox').valid;

        if (isValid) {
            if (discussionQuestionText.length > 40) {
                handleCreateDiscussionAction({ getState, dispatch, setState }, discussionQuestionText);
            } else {
                dispatch("notify", {
                    message: "Your question must be longer than 40 characters!",
                    type: "warning"
                });
            }
        } else {
            dispatch("notify", {
                message: "Your question is not valid!",
                type: "error"
            });
        }
    })
}

// HELPER FUNCTIONS
async function handleCurrentMemberProfilePhoto(getState, setState) {
    if (!getState()._currentMemberData && authentication.loggedIn) {
        const memberData = await getCurrentMemberProfileData();
        setState({ _currentMemberData: memberData });
    }
}

function setupComment({
    profilePhotoElement,
    usernameAndDateElement,
    textElement
}, itemData) {
    if (itemData) {
        profilePhotoElement.src = itemData.memberData.profile.profilePhoto.url;
        usernameAndDateElement.html = `<p class="font_7">${itemData.memberData.profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        textElement.text = itemData.text;
    }
}

async function setDescription(getState, setState) {
    try {
        const total = await getUniqueBuyersCountForThisProduct(getState()._id);
        setState({ _discussionsDescription: `${total} members have this product and can help you.` });
    } catch (err) {
        console.error(err);
    }
}

async function handleReplyAction(store, replyText) {
    try {
        const { getState, dispatch, setState } = store;

        const { _selectedDiscussionData, _id } = getState();
        $w('#sendQuestionReply').disable();

        const hasAdded = await addReplyToDiscussion(_selectedDiscussionData._id, replyText, _id);
        if (hasAdded) {
            refreshDiscussions({ getState, setState });
            $w('#memberReplyTextBox').value = null;
            $w('#memberReplyTextBox').resetValidityIndication();

            dispatch("notify", {
                message: "Your reply has been added!",
                type: "success",
                timeout: 4000
            });
        }

        $w('#sendQuestionReply').enable();
    } catch (err) {
        console.error(err);
    }
}

async function refreshDiscussions(store, isCurrentEnabled = true) {
    try {
        const { getState, setState } = store;
        const { _selectedDiscussionData, _productDiscussions, slug } = getState();

        if (isCurrentEnabled) {
            const updatedDiscussion = await queryProductDiscussions(slug, _selectedDiscussionData._id); //@ts-ignore
            remove(_productDiscussions, obj => obj._id === updatedDiscussion[0]._id);

            setState({ _productDiscussions: [..._productDiscussions, updatedDiscussion[0]] });
            setState({ _selectedDiscussionData: updatedDiscussion[0] });
        } else {
            const new_productDiscussions = await queryProductDiscussions(slug);
            setState({ _productDiscussions: new_productDiscussions });
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleLoadMore({ getState, setState }) {
    try {
        $w('#loadMoreQuestions').disable();
        $w('#loadMoreQuestions').label = 'Loading...';

        const { slug, _productDiscussions } = getState();
        const newChunkData = await queryProductDiscussions(slug, null, _productDiscussions.length);
        setState({ _productDiscussions: [..._productDiscussions, ...newChunkData] });

        $w('#loadMoreQuestions').enable();
        $w('#loadMoreQuestions').label = 'Load More';
    } catch (err) {
        console.error(err);
    }
}

async function handleCreateDiscussionAction({ getState, dispatch, setState }, replyText) {
    try {
        const { _id } = getState();
        $w('#publishQuestionButton').disable();

        const hasAdded = await createDiscussion(replyText, _id);
        if (hasAdded) {
            refreshDiscussions({ getState, setState }, false);
            $w('#questionTextBox').value = null;
            $w('#questionTextBox').resetValidityIndication();

            dispatch("notify", {
                message: "Your question has been created!",
                type: "success",
                timeout: 4000
            });
        }

        $w('#publishQuestionButton').enable();
    } catch (err) {
        console.error(err);
    }
}