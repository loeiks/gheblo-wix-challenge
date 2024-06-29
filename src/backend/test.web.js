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

export const queryReviews = webMethod(Permissions.Anyone, async (options) => {
    try {
        const queryRev = wixAuth.elevate(reviews.queryReviews);
        const result = await queryRev(options).eq("author.contactId", "510eca6e-f6ee-4e06-ac1a-3d753812f270").find();
        return result;
    } catch (error) {
        console.error(error);
        // Handle the error
    }
});