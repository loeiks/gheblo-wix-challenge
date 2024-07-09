export const priceOptions = [
    { label: "Up to 10€", value: "10" },
    { label: "Up to 15€", value: "15" },
    { label: "Up to 20€", value: "20" },
    { label: "Up to 25€", value: "25" },
    { label: "Up to 30€", value: "30" },
    { label: "Up to 50€", value: "50" },
]

export const discountOptions = [
    { label: "Has Discount", value: "true" }
]

// Filtering

export function filterProducts(filters, products) {
    let maxPrices = filters.Price ? filters.Price.map(price => parseFloat(price)) : [];
    let filteredProducts = products.filter(product => {
        if (filters.Discount && filters.Discount.includes("true") && product.discountedPrice === product.price) {
            return false;
        }

        if (maxPrices.length > 0) {
            let maxPrice = Math.max(...maxPrices);
            if (product.discountedPrice > maxPrice) {
                return false;
            }
        }

        if (filters.Size && filters.Size.length > 0) {
            if (product.productOptions.Size) {
                let productSizes = product.productOptions.Size.choices.map(choice => choice.value);
                if (!filters.Size.every(size => productSizes.includes(size))) {
                    return false;
                }
            } else {
                return false;
            }
        }

        if (filters.Color && filters.Color.length > 0) {
            if (product.productOptions.Color) {
                let productColors = product.productOptions.Color.choices.map(choice => choice.value);
                if (!filters.Color.every(color => productColors.includes(color))) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    });

    return filteredProducts;
}
