/**
 * Removes query parameters from a given URL.
 * @param {string} inputUrl - The URL from which to remove query parameters.
 * @returns {string} - The URL without query parameters.
 */
export function removeQueryParameters(inputUrl) {
    const parsedUrl = new URL(inputUrl);
    parsedUrl.search = '';
    return parsedUrl.toString();
}