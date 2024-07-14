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
 * @returns {void} Returns collapse function
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
        type = "standard";
    }

    if (!timeout) {
        timeout = 3500;
    }

    if ($w('#notifierMemberPages').rendered) {
        $w('#notifierTextMemberPages').text = message;

        $w('#notifierMemberPages').customClassList.values().forEach((className) => { $w('#notifierMemberPages').customClassList.remove(className); });
        $w('#notifierMemberPages').customClassList.add("notifier-" + type);
        $w('#notifierMemberPages').customClassList.add("notifier");
        $w('#notifierMemberPages').expand();

        timeoutId = setTimeout(() => {
            if (!$w('#notifierMemberPages').collapsed) {
                $w('#notifierMemberPages').collapse();
            }
        }, timeout);
    }

    if ($w('#notifierBackground').rendered) {
        $w('#notifierText').text = message;

        $w('#notifierBackground').customClassList.values().forEach((className) => { $w('#notifierBackground').customClassList.remove(className); });
        $w('#notifierBackground').customClassList.add("notifier-" + type);
        $w('#notifierBackground').customClassList.add("notifier");
        $w('#notifierBackground').expand();

        timeoutId = setTimeout(() => {
            if (!$w('#notifierBackground').collapsed) {
                $w('#notifierBackground').collapse();
            }
        }, timeout);
    }
}