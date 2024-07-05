import { lightbox } from "wix-window-frontend";

$w.onReady(function () {
    $w('Button').onClick((event) => {
        const answer = event.target.id;
        if (answer === "yes") {
            lightbox.close(true);
        } else {
            lightbox.close(false);
        }
    });
});