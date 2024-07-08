import { ObjectId } from 'mongodb';

/**
 * Recursively converts ObjectId fields to strings in a document.
 * @param {object} doc - The document to process.
 */
function convertObjectIdToString(doc) {
    if (Array.isArray(doc)) {
        // If the document is an array, recursively process each element.
        for (let i = 0; i < doc.length; i++) {
            convertObjectIdToString(doc[i]);
        }
    } else if (doc !== null && typeof doc === 'object') {
        // If the document is an object, iterate over its properties.
        for (const key in doc) {
            if (doc.hasOwnProperty(key)) {
                if (key === '_id' && doc[key] instanceof ObjectId) {
                    // Convert ObjectId to string.
                    doc[key] = doc[key].toString();
                } else {
                    // Recursively process nested objects and arrays.
                    convertObjectIdToString(doc[key]);
                }
            }
        }
    }
}

/**
 * Processes an array of documents, converting ObjectId fields to strings.
 * @param {object[]} docs - The array of documents to process.
 * @returns {object[]} - The processed array of documents.
 */
export function recursivelyConvertIds(docs) {
    docs.forEach(doc => convertObjectIdToString(doc));
    return docs;
}