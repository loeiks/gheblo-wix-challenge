import moment from 'moment';
import { _icons_ } from '../icons';
import { to } from 'wix-location-frontend';
import { useScope } from 'repeater-scope';
import { currentMember, authentication } from 'wix-members-frontend';

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function renderQuestions(state, store) {
    setupInitView(state, store);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
async function setupInitView(state, { dispatch, setState, getState, connect }) {
    if (authentication.loggedIn()) {
        setState({ _currentMember: await currentMember.getMember({ fieldsets: ["PUBLIC"] }) });
    }
};

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function setupQuestionsStateEvents(state, store) {
    const { dispatch, setState, getState, connect } = store;
    setEventListeners(state, store);

    connect("_productQuestions", ({ _productQuestions }) => {
        if (_productQuestions) {
            if (_productQuestions?.questions?.length > 0) {
                setState({ noQuestions: false });
                $w('#questionsRepeater').data = [];
                $w('#questionsRepeater').data = _productQuestions.questions;
            } else {
                setState({ noQuestions: true });
            }
        } else {
            setState({ noQuestions: true });
        }
    });

    connect("noQuestions", ({ noQuestions }) => {
        if (noQuestions === true) {
            $w('#questionsSection').delete();
            $w('#emptyQuestionStateSection').restore();
        } else {
            $w('#questionsSection').restore();
            $w('#emptyQuestionStateSection').delete();
        }
    });

    connect("_uniqueBuyersCount", ({ _uniqueBuyersCount }) => {
        if (_uniqueBuyersCount) {
            $w('#questionsDescriptionText').text = `${_uniqueBuyersCount > 0 ? _uniqueBuyersCount : 2} members have this product and can help you.`;
            $w('#haveAQuestionText').text = `Do you have any question about the product? ${_uniqueBuyersCount > 0 ? _uniqueBuyersCount : 2} members have this product and can help you.`;
        }
    });
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
function setEventListeners(state, { dispatch, setState, getState, connect }) {
    $w('#questionsRepeater').onItemReady(($item, itemData, index) => {
        const { profile } = itemData.member.entity;

        // Question
        $item('#questionMemberProfilePhoto').src = profile.profilePhoto?.url || _icons_.profilePhotoNull;
        $item('#questionMemberUsernameAndDate').html = `<p class="font_7">${profile.nickname} | <span style="color: #5d5e61">${moment(itemData._updatedDate).format('DD MMM YYYY')}</span></p>`;
        $item('#questionText').text = itemData.text;

        const { _currentMember } = getState();
        if (itemData._owner === _currentMember?._id) { //@ts-ignore
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

    $w('#createNewQuestion, #askQuestion').onClick(() => {
        const { slug } = getState();
        to(`https://www.gheblo.com/questions/${slug}?create=true`);
    });

    $w('#questionItem, #questionRepliesButton, #replyToQuestionButton').onClick((event) => {
        const { slug } = getState();
        const { itemData } = useScope(event);
        to(`https://www.gheblo.com/questions/${slug}/${itemData._id}`);
    });

    $w('#seeMoreQuestion').onClick(() => {
        const { slug } = getState();
        to(`https://www.gheblo.com/questions/${slug}`);
    })
}