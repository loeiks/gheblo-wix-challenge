import { webMethod, Permissions } from "wix-web-module";
export const getDataTest = webMethod(Permissions.Anyone, async (req) => {
    try {
        return req;
    }
    catch (err) {
        throw new Error(`${err}`);
    }
});
