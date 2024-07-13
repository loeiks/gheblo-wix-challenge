// Wix API Imports
import { getRouterData } from 'wix-window-frontend';
import { query, to } from 'wix-location-frontend';
// NPM Imports
import { createStoreon } from 'storeon-velo';
import { useScope } from 'repeater-scope';
import moment from 'moment';
import axios from 'axios';
// Public Imports
import { setupHeader } from 'public/MemberPages/memberHeaders';
import { showNotifier } from 'public/notifier';
import { highLightCurrentTab } from 'public/MemberPages/memberMenu'; //@ts-ignore
import { locations } from 'public/MemberPages/drop-off-locations.json';
// Backend Imports
import { cancelOrder, createReturnRequest } from 'backend/Members/member_orders.web';

/**
 * Setup Store for Explore Feed Page
 * @param {import('storeon-velo').StoreonStore} store 
 */
const myAccountStore = (store) => {
    store.on("@init", () => ({
        returnType: "dropoff",
        _returningProductIds: []
    }))

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
            balanceSummary,
            returnRequest
        } = _currentOrder;

        $w('#currentOrderNoAndDate').text = `Order No: ${number} · ${moment(_createdDate["$date"]).format("DD/MM/YYYY HH:mm")}`;

        const orderStatus = getStatusByOrderData(fulfillmentStatus, paymentStatus, status, returnRequest);
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

    //@ts-ignore
    $w('#locationMap').markers = locations;
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
        if (!_currentOrder) return null;

        // Normal Items
        $w('#lineItemsRepeater').data = [{ _id: "1" }];
        $w('#lineItemsRepeater').data = _currentOrder.lineItems;

        // Return Items
        const returnItems = _currentOrder?.returnRequest?.returningProductIds || [];
        $w('#returnProductsRepeater').data = [{ _id: "1" }];
        $w('#returnProductsRepeater').data = _currentOrder.lineItems.filter(item => returnItems.includes(item.catalogReference.catalogItemId));

        // Render View
        dispatch("renderCurrentOrder");
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
                case "returnOrder": {
                    $w('#title').text = "Return Request";
                    $w('#stateBox').changeState("returnOrder");
                    break;
                }
                default: {
                    break;
                }
            }
        }
    });

    connect("returnType", async ({ returnType, _currentOrder, _orderAddress }) => {
        if (!returnType) return null;
        if (!_currentOrder) return null;

        const orderAddress = _currentOrder.billingInfo.address;
        console.log(orderAddress);

        if (returnType === "dropoff") {
            //@ts-ignore
            $w('#locationMap').markers = locations;
            $w('#selectedAddressDetails').text = "Please select a drop-off location from the map below:";
        } else {
            const {
                addressLine1,
                addressLine2,
                city,
                country,
                postalCode
            } = orderAddress;

            const address = `${addressLine1}, ${addressLine2 ? addressLine2 : ""} ${postalCode} ${city}/${country}`;

            let currentAddress = _orderAddress;
            if (!_orderAddress) {
                const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
                if (response.data.length > 0) {
                    setState({ _orderAddress: response.data[0] });
                    currentAddress = response.data[0];
                }
            }

            //@ts-ignore
            $w('#locationMap').markers = [{
                ...locations[0],
                address,
                location: {
                    longitude: parseFloat(currentAddress.lon),
                    latitude: parseFloat(currentAddress.lat)
                },
                title: "Home"
            }];

            $w('#selectedAddressDetails').text = `We will collect products (only the ones that will be returned) from your order address: ${address}`;
        }
    });
}

function setEventListeners() {
    $w('#ordersRepeater').onItemReady(($item, itemData, index) => {
        const { fulfillmentStatus, paymentStatus, status, returnRequest } = itemData;

        const orderStatus = getStatusByOrderData(fulfillmentStatus, paymentStatus, status, returnRequest);
        $item('#orderStatus').text = orderStatus
        if (orderStatus === "Cancelled") {
            $item('#orderStatus').customClassList.add("cancelled-order-status-text");
        }

        // Order items and total data
        const orderItems = itemData.lineItems.slice(0, 3).map(l => l.productName.original).join(", ");
        const totalItems = calculateTotalItemCount(itemData.lineItems);
        $item('#orderItems').text = `(${totalItems} Items in Total) | ${orderItems}${totalItems > 3 ? `and ${totalItems - 3} more...` : ""}`;

        // Order date
        $item('#orderDate').text = `${moment(itemData._createdDate["$date"]).format("DD MMM YYYY HH:mm")}`;

        // Set first product image
        $item('#orderImage').src = getImageURL(itemData.lineItems[0].image);
    });

    //@ts-ignore
    $w('#orderDetailsButton, #orderItem').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentOrder: itemData });
        setState({ _currentState: "order" });
    });

    $w('#lineItemsRepeater').onItemReady(($item, itemData, index) => {
        if (itemData._id === "1") return null;

        const { _currentOrder } = getState();
        $item('#lineItemImage').src = getImageURL(itemData.image);

        const { returnRequest } = _currentOrder;

        if (returnRequest) {
            const isInReturn = returnRequest.returningProductIds.includes(itemData.catalogReference.catalogItemId);
            const returnText = isInReturn ? "In Return Request " : "";

            if (itemData.quantity > 1) {
                $item('#lineItemName').html = `<p>${itemData.productName.original} <span style="color:#7c5800;">${returnText}</span> <span style="color:#5d5e61;">${itemData.quantity}x</span></p>`;
            } else {
                $item('#lineItemName').html = `<p>${itemData.productName.original} <span style="color:#7c5800;">${returnText}</span></p>`;
            }
        } else {
            if (itemData.quantity > 1) {
                $item('#lineItemName').html = `<p>${itemData.productName.original} <span style="color:#5d5e61;">${itemData.quantity}x</span></p>`;
            } else {
                $item('#lineItemName').text = itemData.productName.original;
            }
        }

        $item('#lineItemPrice').text = itemData.lineItemPrice.formattedAmount;
    });

    $w('#backToOrdersButton').onClick(() => {
        setState({ _currentState: "orders" });
    });

    // Action Buttons
    $w('#cancelOrderButton').onClick(() => { setState({ _currentState: "cancelOrder" }); });
    $w('#backToOrdersButtonInReturn').onClick(() => { setState({ _currentState: "orders" }); });

    $w('#contactSupportButton').onClick(() => {
        contactSupport();
    });

    $w('#contactSupportForOrderButton').onClick((event) => {
        const { itemData } = useScope(event);
        setState({ _currentOrder: itemData });
        contactSupport();
    });

    $w('#startCancelOrder').onClick(async () => {
        $w('#startCancelOrder').disable();
        const { _currentOrder } = getState();

        const reason = $w('#cancelReasonDropdown').value;
        const cancelledOrder = await cancelOrder(_currentOrder._id, reason);

        if (cancelledOrder) {
            dispatch("notify", { message: "Order has been cancelled.", type: "success" });
            setState({ _currentOrder: cancelledOrder });
            setState({ _currentState: "order" });
        } else {
            dispatch("notify", { message: "Failed to cancel order!", type: "error" });
        }

        $w('#startCancelOrder').enable();
    });

    $w('#returnOrderButton').onClick(() => {
        setState({ _currentState: "returnOrder" });
    });

    $w('#returnTypeDropdown').onChange((event) => {
        setState({ returnType: event.target.value });
    });

    //@ts-ignore
    $w('#locationMap').onMarkerClicked((event) => {
        const { address, title } = event;
        const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
        $w('#selectedAddressDetails').html = `<p>You will drop off the selected product at the selected drop off point, here: <span style="color:black;">${title} | <a style="color:#006a63;" href="${href}">${address}</a></span></p>`;
        setState({ _selectedDropOffPoint: title });
    });

    $w('#returnProductsRepeater').onItemReady(($item, itemData, index) => {
        $item('#productImageForReturn').src = getImageURL(itemData.image);

        if (itemData.quantity > 1) {
            $item('#productNameForReturn').html = `<p>${itemData.productName.original} <span style="color:#5d5e61;">${itemData.quantity}x</span></p>`;
        } else {
            $item('#productNameForReturn').text = itemData.productName.original;
        }
    });

    $w('#returnCheckbox').onClick((event) => {
        const { itemData, $item } = useScope(event);
        const { _returningProductIds } = getState();

        if ($item("#returnCheckbox").checked) {
            setState({ _returningProductIds: [..._returningProductIds, itemData.catalogReference.catalogItemId] });
        } else {
            const updatedIds = _returningProductIds.filter(id => id !== itemData.catalogReference.catalogItemId);
            setState({ _returningProductIds: updatedIds });
        }
    });

    $w('#startReturnProcessBtn').onClick(async () => {
        try {
            const isValid = validateReturnRequest();
            if (!isValid) return null;

            // Returning products because it's valid
            $w('#startReturnProcessBtn').disable();
            $w('#startReturnProcessBtn').label = "Creating Return Request...";

            const { _currentOrder, _returningProductIds, _selectedDropOffPoint, returnType, _orderAddress } = getState();
            await createReturnRequest(_currentOrder._id, {
                returningProductIds: _returningProductIds,
                selectedDropoffPoint: _selectedDropOffPoint,
                returnAddress: _orderAddress,
                returnType,
            });

            dispatch("notify", { message: "Return request has been created successfully", type: "success" });

            if (returnType === "dropoff") {
                to("https://gheblo.com/support/article/how-to-return-products-with-dropoff-points/");
            } else {
                to(`https://gheblo.com/support/article/how-to-return-products-with-home-collection/`);
            }

            setState({ _returningProductIds: undefined, _selectedDropOffPoint: undefined, _orderAddress: undefined, returnType: "dropoff" });
            $w('#returnTypeDropdown').value = "dropoff";

            $w('#startReturnProcessBtn').enable();
            $w('#startReturnProcessBtn').label = "Start Return & Refund Process";
        } catch (err) {
            dispatch("notify", { message: "We couldn't create your return request!", type: "error" });
            console.error("Failed to create return request. Please try again later.", err);
        }
    });
}

// HELPER FUNCTIONS
function getStatusByOrderData(fulfillmentStatus, paymentStatus, status, returnRequest) {
    function getStatus() {
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

    const statusText = getStatus();
    if (statusText === "Delivered" && returnRequest) {
        switch (returnRequest.returnStatus) {
            case "PENDING": {
                return `${statusText} - Return Request Pending`;
            }
            case "PARCEL_RECEIVED": {
                return `${statusText} - Return Request Parcels Received`;
            }
            case "RETURNED": {
                return `${statusText} - Return Request Completed`;
            }
            default: {
                return statusText;
            }
        }
    } else {
        return statusText;
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
    $w('#wixChatBox').expand();
}

function calculateTotalItemCount(lineItems) {
    return lineItems.reduce((accumulator, item) => {
        return accumulator + item.quantity;
    }, 0);
}

function validateReturnRequest() {
    const { returnType, _orderAddress, _selectedDropOffPoint, _returningProductIds } = getState();

    if (_returningProductIds.length === 0) {
        dispatch("notify", { message: "Please select at least one product to return!", type: "error" });
        return false;
    }

    if (returnType === "dropoff") {
        if (!_selectedDropOffPoint) {
            dispatch("notify", { message: "You have to select a drop-off point first!", type: "error" });
            return false;
        }
    } else {
        if (!_orderAddress) {
            dispatch("notify", { message: "There is an issue with your home address, please try again later or contact support!", type: "error", timeout: 5000 });
            return false;
        }
    }

    return true;
}