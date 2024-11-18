import { to, path } from "wix-location-frontend";
import { showNotifier } from "public/notifier";

$w.onReady(function () {
    console.log(path)
    showNotifier({
        message: "We will redirect you to your order details page in 4 seconds.",
        type: "standard",
        timeout: 10000
    });

    setTimeout(() => {
        // Redirect to order details page with orderId from the URL path
        to(`https://exweiv.wixstudio.io/gheblo/account/orders?orderId=${path[1]}`);
    }, 4000);
});
