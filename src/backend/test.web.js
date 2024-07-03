import { reviews } from "wix-reviews.v2";
import { webMethod, Permissions } from "wix-web-module";
import * as wixAuth from 'wix-auth';

export const createReview = webMethod(Permissions.Anyone, async (review) => {
    try {
        const createRev = wixAuth.elevate(reviews.createReview);
        const result = await createRev(review);
        return result;
    } catch (error) {
        console.error(error);
        // Handle the error
    }
});