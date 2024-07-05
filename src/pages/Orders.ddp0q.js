// Wix API Imports
import { getRouterData } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import { remove } from 'lodash';
import moment from 'moment';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';
// Backend Imports
import { cancelOrder } from 'backend/Members/member_orders.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const myAccountStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });

    // Global Notifier
    store.on("notify", (state, notifierData) => {
        showNotifier(notifierData);
    });

    store.on("renderCurrentOrder", ({ _currentOrder }) => {
        const {
            number,
            _createdDate,
            fulfillmentStatus, paymentStatus, status,
            priceSummary,
            balanceSummary
        } = _currentOrder;

        $w('#currentOrderNoAndDate').text = `Order No: ${number} · ${moment(_createdDate).format("DD/MM/YYYY HH:MM")}`;

        const orderStatus = getStatusByOrderData(fulfillmentStatus, paymentStatus, status);
        $w('#currentOrderStatus').text = orderStatus;
        if (orderStatus === "Cancelled") {
            $w('#currentOrderStatus').customClassList.add("cancelled-order-status-text");
        } else {
            $w('#currentOrderStatus').customClassList.remove("cancelled-order-status-text");
        }

        $w('#totalProductsPrice').text = priceSummary.subtotal.formattedAmount;
        $w('#shippingCost').text = priceSummary.shipping.formattedAmount;
        $w('#taxAmount').text = priceSummary.tax.formattedAmount;
        $w('#discountAmount').text = priceSummary.discount.formattedAmount;

        if (parseFloat(balanceSummary.refunded.amount) > 0) { //@ts-ignore
            $w('#refundT, #refundAmount').expand();
            $w('#refundAmount').text = balanceSummary.refunded.formattedAmount;
        }

        $w('#totalOrderPrice').text = priceSummary.total.formattedAmount;

        const isCancellable = isPossibleToCancel(fulfillmentStatus);
        if (isCancellable) {
            if (orderStatus !== "Cancelled") {
                $w('#cancelOrderButton').expand();
            }

            $w('#returnOrderButton').collapse();
        } else {
            if (orderStatus !== "Fully Refunded") {
                $w('#returnOrderButton').expand();
            }

            $w('#cancelOrderButton').collapse();
        }
    });
}

// Setup Store Functions
const store = createStoreon([myAccountStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    const routerData = getRouterData();
    initPage(routerData);
    return readyStore();
});

async function initPage(routerData) {
    // Register State Events
    setupStateEvents();
    highLightCurrentTab();

    const {
        currentMemberHeaderData,
        orders
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);

    setState({
        ordersResponse: orders,
        orders: orders.items.map(order => order.entity)
    });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();

    connect("orders", ({ orders }) => {
        if (orders) {
            if (orders.length > 0) {
                setState({ noOrders: false });
                $w('#ordersRepeater').data = [];
                $w('#ordersRepeater').data = orders;
            } else {
                setState({ noOrders: true });
            }
        } else {
            setState({ noOrders: true });
        }
    });

    connect("noOrders", ({ noOrders }) => {
        if (noOrders === true) {
            $w('#ordersRepeater').collapse();
            $w('#noOrdersText').expand();
        } else {
            $w('#noOrdersText').collapse();
            $w('#ordersRepeater').expand();
        }
    });

    connect("_currentOrder", ({ _currentOrder }) => {
        if (_currentOrder) {
            $w('#lineItemsRepeater').data = _currentOrder.lineItems;
            dispatch("renderCurrentOrder");
        }
    });

    connect("_currentState", ({ _currentState }) => {
        if (_currentState) {
            switch (_currentState) {
                case "cancelOrder": {
                    $w('#title').text = "Back to Orders";
                    $w('#stateBox').changeState("cancelOrder");
                    break;
                }
                case "orders": {
                    $w('#title').text = "Orders";
                    $w('#stateBox').changeState("orders");
                    break;
                }
                case "order": {
                    $w('#title').text = "Order";
                    $w('#stateBox').changeState("order");
                    break;
                }
                default: {
                    break;
                }
            }
        }
    });
}

function setEventListeners() {
    $w('#ordersRepeater').onItemReady(($item, itemData, index) => {
        const { fulfillmentStatus, paymentStatus, status } = itemData;

        const orderStatus = getStatusByOrderData(fulfillmentStatus, paymentStatus, status);
        $item('#orderStatus').text = orderStatus
        if (orderStatus === "Cancelled") {
            $item('#orderStatus').customClassList.add("cancelled-order-status-text");
        }

        const orderItems = itemData.lineItems.slice(0, 3).map(l => l.productName.original).join(", ");
        $item('#orderItems').text = `${orderItems}${itemData.lineItems.length > 3 ? `and ${itemData.lineItems.length - 3} more...` : ""}`;
        $item('#orderDate').text = `${moment(itemData._createdDate).format("DD MMM YYYY")}`;

        // Set first product image
        $item('#orderImage').src = getImageURL(itemData.lineItems[0].image);
    });

    $w('#orderDetailsButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentOrder: itemData });
        setState({ _currentState: "order" });
    });

    $w('#lineItemsRepeater').onItemReady(($item, itemData, index) => {
        $item('#lineItemImage').src = getImageURL(itemData.image);
        $item('#lineItemName').text = itemData.productName.original;
        $item('#lineItemPrice').text = itemData.price.formattedAmount;
    });

    //@ts-ignore
    $w('#backToOrdersButton, #currentOrderNoAndDate').onClick((event) => {
        setState({ _currentState: "orders" });
    });

    // Action Buttons
    $w('#cancelOrderButton').onClick(() => { setState({ _currentState: "cancelOrder" }); })

    $w('#contactSupportButton').onClick(() => {
        contactSupport();
    });

    $w('#contactSupportForOrderButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentOrder: itemData });
        contactSupport();
    })

    $w('#returnOrderButton').onClick((event) => {
        contactSupport();
    });

    $w('#startCancelOrder').onClick(async () => {
        $w('#startCancelOrder').disable();
        const { _currentOrder } = getState();

        const reason = $w('#cancelReasonDropdown').value;
        const cancelledOrder = await cancelOrder(_currentOrder._id, reason);

        if (cancelledOrder) {
            dispatch("notify", { message: "Order has been cancelled", type: "success" });
            setState({ _currentOrder: cancelledOrder });
            setState({ _currentState: "order" });
        } else {
            dispatch("notify", { message: "Failed to cancel order", type: "error" });
        }

        $w('#startCancelOrder').enable();
    });

    $w('#title').onClick(() => setState({ _currentState: "orders" }));
}

// HELPER FUNCTIONS

function getStatusByOrderData(fulfillmentStatus, paymentStatus, status) {
    if (status === "CANCELED") {
        // Cancelled
        return "Cancelled";
    }

    if (paymentStatus === "PAID") {
        // Normal
        switch (fulfillmentStatus) {
            case "NOT_FULFILLED": {
                return "In Progress";
            }
            case "PARTIALLY_FULFILLED": {
                return "Dispatched";
            }
            case "FULFILLED": {
                return "Delivered";
            }
            default: {
                return "Pending";
            }
        }
    } else if (paymentStatus === "FULLY_REFUNDED") {
        // Refunded
        return "Fully Refunded";
    } else if (paymentStatus === "PARTIALLY_REFUNDED") {
        // Some Refunds
        return "Partially Refunded";
    }

    switch (fulfillmentStatus) {
        case "NOT_FULFILLED": {
            return "In Progress";
        }
        case "PARTIALLY_FULFILLED": {
            return "Dispatched";
        }
        case "FULFILLED": {
            return "Delivered";
        }
        default: {
            return "Pending";
        }
    }
}

function isPossibleToCancel(fulfillmentStatus) {
    if (fulfillmentStatus === ("NOT_FULFILLED" || "PARTIALLY_FULFILLED")) {
        return true;
    } else {
        return false;
    }
}

function extractVideoId(str) {
    const match = str.match(/wix:image:\/\/v1\/([^~]+)/);
    return match ? match[1] : null;
}

function getImageURL(image) {
    const videoId = extractVideoId(image);
    return `https://static.wixstatic.com/media/${videoId}~mv2.jpg`;
}

async function contactSupport() { //@ts-ignore
    $w('#wixChatBox').maximize();
}