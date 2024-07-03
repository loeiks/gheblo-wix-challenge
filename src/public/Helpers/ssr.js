import { warmupData, rendering } from 'wix-window-frontend';

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} func
 * @returns {Promise<T>}
 */
export const ssRedering = async (key, func) => {
    if (rendering.env === 'backend') {
        const data = await func();
        warmupData.set(key, data);
        return data;
    }

    const data = warmupData.get(key);

    if (data) {
        return data;
    }

    return func();
};