/**
 * 
 * @param {string} dir 
 * @param {string} funcName 
 * @param  {...any} params 
 * @returns 
 */
export function validateParamsExists(dir, funcName, ...params) {
    for (const param of params) {
        if (!param) {
            throw new Error(`${dir}/${funcName} - Missing required parameter: ${param}`);
        }
    }
    
    return true;
}