export function calculateDiscountPercentage(originalPrice, discountedPrice) {
    if (originalPrice <= 0) {
        throw new Error('Original price must be greater than zero.');
    }
    const discountAmount = originalPrice - discountedPrice;
    const discountPercentage = (discountAmount / originalPrice) * 100;
    return discountPercentage.toFixed(0);
}