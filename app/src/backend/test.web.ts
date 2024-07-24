/// <reference path="../../../.wix/types/wix-code-types/dist/types/node/index.d.ts" />
/// <reference path="../../../.wix/types/wix-code-types/dist/types/backend/index.d.ts" />

import { webMethod, Permissions } from "wix-web-module";
type Person = { name: string, age: number };

export const getDataTest = webMethod(Permissions.Anyone, async (req: Person): Promise<Person> => {
    try {
        return req;
    } catch (err) {
        throw new Error(`${err}`);
    }
});