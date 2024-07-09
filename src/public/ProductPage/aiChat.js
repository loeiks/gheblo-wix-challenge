import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';
import { initial } from 'lodash';

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
            const currentData = initial($w('#aiChatRepeater').data);
            const newData = [...currentData, {
                _id: uuidv4(),
                parts: [{ text: _aiResponse }],
                role: "model"
            }];

            setState({ _aiChatArray: newData });
        }
    });

    connect("_aiChatArray", ({ _aiChatArray }) => {
        if (_aiChatArray?.length > 0) {
            $w('#aiChatRepeater').data = _aiChatArray;
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
        console.log(itemData);

        if (itemData.parts[0].text === "_typing_lottie") {
            $item('#typingAnimationLottie').expand();
            $item('#aiChatMessageText').collapse();
        } else {
            $item('#typingAnimationLottie').collapse();
            $item('#aiChatMessageText').expand();
            $item('#aiChatMessageText').html = marked(itemData.parts[0].text);
        }
    });

    $w('#aiQuestionSuggestions').onChange((event) => {
        const selectedPrompt = event.target.value[0];

        if (selectedPrompt) {
            updateAiChatHistory(selectedPrompt);
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

    $w('#aiPromptInput').onInput((event) => {
        const charCount = event.target.value.length;
        const size = Math.round(charCount / 26);

        if (size > 1 && size < 15) {
            $w('#aiPromptInput').customClassList.values().forEach(v => $w('#aiPromptInput').customClassList.remove(v));
            $w('#aiPromptInput').customClassList.add(`ai-textbox-h${size}`);
        } else {
            if (charCount < 26) {
                $w('#aiPromptInput').customClassList.values().forEach(v => $w('#aiPromptInput').customClassList.remove(v));
            }
        }
    })

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
function updateAiChatHistory(message) {
    const currentData = $w('#aiChatRepeater').data;
    const newData = [...currentData, {
        _id: uuidv4(),
        parts: [{ text: message }],
        role: "user"
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
    if (currentPrompt?.length > 0) {
        updateAiChatHistory(currentPrompt);
        dispatch("getPromptResponse", currentPrompt);
        $w('#aiPromptInput').value = null;
        $w('#aiPromptInput').resetValidityIndication();
        $w('#aiPromptInput').customClassList.values().forEach(v => $w('#aiPromptInput').customClassList.remove(v));
    }
}