let timeoutId;

/**
 * @function
 * @description
 * This function shows a message on the bottom of the screen with custom CSS type and timeout as well as a message with them.
 * 
 * @param {{
 * message: string,
 * type: string,
 * timeout: number
 * }} param0 
 * @returns {function} Returns collapse function
 */
export function showNotifier({
    message,
    type,
    timeout
}) {
    if (!message) {
        throw new Error(`Message is required data!!`);
    }

    // Clear current timeout
    timeoutId ? clearTimeout(timeoutId) : () => { };

    if (!type) {
        type = "standart";
    }

    if (!timeout) {
        timeout = 3000;
    }

    $w('#notifierText').text = message;
    $w('#notifierBackground').customClassList.values().forEach((className) => { $w('#notifierBackground').customClassList.remove(className); });
    $w('#notifierBackground').customClassList.add("notifier-" + type);
    $w('#notifierBackground').expand();

    timeoutId = setTimeout(() => {
        if (!$w('#notifierBackground').collapsed) {
            $w('#notifierBackground').collapse();
        }
    }, timeout);

    return $w('#notifierBackground').collapse;
}