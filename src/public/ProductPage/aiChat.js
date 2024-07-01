import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 */
export function renderAiChat(state, store) {
    // Set data to nothing for chat
    $w('#aiChatRepeater').data = [];
    setupInitView(state, store);
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
function setupInitView(state, { dispatch, setState, getState, connect }) {
    $w('#aiChatRepeater').hide();
    $w('#aiQuestionSuggestions').options = getState()._aiSuggestedPrompts;
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
export function setupAIStateEvents(state, store) {
    const { dispatch, setState, getState, connect } = store;
    setEventListeners(state, store);

    connect("_aiResponse", ({ _aiResponse }) => {
        if (_aiResponse) {
            $w('#aiPromptInput').enable();
            updateAiChatHistory(_aiResponse, "model");
        }
    });
}

/**
 * @param {{[key: string]: any}} state 
 * @param {import("storeon-velo").StoreonVeloApi} store
 * @returns {void} Returns nothing it's just a void 
 */
function setEventListeners(state, { dispatch, setState, getState, connect }) {
    $w('#aiChatRepeater').onItemReady(($item, itemData, index) => {
        $item('#aiChatMessageText').html = marked(itemData.parts[0].text);
    });

    $w('#aiQuestionSuggestions').onChange((event) => {
        const selectedPrompt = event.target.value[0];

        if (selectedPrompt) {
            updateAiChatHistory(selectedPrompt, "user");
            dispatch("getPromptResponse", selectedPrompt);
        }
    });

    $w('#aiSendPrompt').onClick(() => {
        sendPrompt(dispatch);
    });

    $w('#aiPromptInput').onKeyPress((event) => {
        if (event.key === "Enter") {
            sendPrompt(dispatch);
        }
    });

    $w('#closeAiChat').onClick(() => {
        $w('#aiHelperBox').delete();
        $w('#aiChatLoader').restore();
    });

    $w('#aiChatLoader').onClick(() => {
        $w('#aiChatLoader').delete();
        $w('#aiHelperBox').restore();

        if ($w('#aiHelperBox').collapsed) {
            $w('#aiHelperBox').expand();
        }
    })
}

// HELPER FUNCTIONS
function updateAiChatHistory(message, role) {
    const currentData = $w('#aiChatRepeater').data;
    const newData = [...currentData, {
        _id: uuidv4(),
        parts: [{ text: message }],
        role
    }];

    $w('#aiChatRepeater').data = newData;

    if (!$w('#aiQuestionSuggestions').collapsed) {
        $w('#aiQuestionSuggestions').collapse();
    }

    if ($w('#aiChatRepeater').hidden) {
        $w('#aiChatRepeater').show();
    }
}

function sendPrompt(dispatch) {
    const currentPrompt = $w('#aiPromptInput').value;
    if (currentPrompt) {
        if (currentPrompt.length > 1) {
            updateAiChatHistory(currentPrompt, "user");
            dispatch("getPromptResponse", currentPrompt);
            $w('#aiPromptInput').value = null;
            $w('#aiPromptInput').resetValidityIndication();
        }
    }
}