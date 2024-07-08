/**
 * Create a promise queue
 *
 * @typedef {() => Promise<unknown>} Action
 *
 * @param {number} [maxLength] - max count actions in the queue
 * @returns {(action: Action) => void}
 */
export const createQueue = (maxLength = 1) => {
    /** @type {boolean} */
    let isActive = false;

    /** @type {Action[]} */
    const actions = [];

    const runQueue = () => {
        if (isActive) {
            return;
        }

        if (actions.length > 0) {
            const action = actions.shift();

            isActive = true;

            action().then(() => {
                isActive = false;
                runQueue();
            });
        }
    };

    return (action) => {
        if (actions.length >= maxLength) {
            actions.pop();
        }

        actions.push(action);
        runQueue();
    };
};