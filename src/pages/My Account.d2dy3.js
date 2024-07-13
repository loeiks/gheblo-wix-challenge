// Wix API Imports
import { getRouterData } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import moment from 'moment';
import { useScope } from 'repeater-scope';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu';

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

    const {
        currentMemberHeaderData,
        recentOrdersOfCurrentMember
    } = routerData;

    // Setup Page Header for Desktop
    await setupHeader(currentMemberHeaderData);

    setState({
        recentOrdersOfCurrentMember
    });
}

function setupStateEvents() {
    // Register Event Listeners Before any State Event Handling
    setEventListeners();
    highLightCurrentTab();

    connect("recentOrdersOfCurrentMember", ({ recentOrdersOfCurrentMember }) => {
        if (recentOrdersOfCurrentMember) {
            if (recentOrdersOfCurrentMember.length > 0) {
                setState({ noRecentOrder: false });
                $w('#recentOrdersRepeater').data = [];
                $w('#recentOrdersRepeater').data = recentOrdersOfCurrentMember;
            } else {
                setState({ noRecentOrder: true });
            }
        } else {
            setState({ noRecentOrder: true });
        }
    });

    connect("noRecentOrder", ({ noRecentOrder }) => {
        if (noRecentOrder === true) {
            $w('#recentOrdersRepeater').collapse();
            $w('#noRecentOrderText').expand();
        } else {
            $w('#noRecentOrderText').collapse();
            $w('#recentOrdersRepeater').expand();
        }
    });
}

function setEventListeners() {
    $w('#recentOrdersRepeater').onItemReady(($item, itemData, index) => {
        const order = itemData.entity;

        if (order.lineItems.length > 1) {
            $item('#orderFirstLineItemName').text = `${order.lineItems[0].productName.original} + ${order.lineItems.length - 1} more...`;
        } else {
            $item('#orderFirstLineItemName').text = order.lineItems[0].productName.original;
        }

        $item('#orderDate').text = `${moment(order._createdDate).format("DD MMM YYYY")}`;

        // Handle Order Status
        const orderStatus = getStatusByOrderData(order.fulfillmentStatus, order.paymentStatus, order.status);
        $item('#orderStatusText').customClassList.remove("status-warning");
        $item('#orderStatusText').text = orderStatus;
        if (orderStatus === "Delivered") {
            $item('#orderStatus').value = 4;
        } else if (orderStatus === "Dispatched") {
            $item('#orderStatus').value = 3;
        } else if (orderStatus === "In Progress") {
            $item('#orderStatus').value = 2;
        } else if (orderStatus === "Cancelled") {
            $item('#orderStatusText').customClassList.add("status-cancelled");
            $item('#orderStatus').value = 4;
        } else if (orderStatus === "Pending") {
            $item('#orderStatus').value = 1;
        } else {
            $item('#orderStatus').value = 4;
        }
    });

    $w('#orderItemContainer').onClick((event) => {
        const { $item, itemData } = useScope(event);
        to(`https://www.gheblo.com/account/orders?orderId=${itemData._id}`);
    });
}

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