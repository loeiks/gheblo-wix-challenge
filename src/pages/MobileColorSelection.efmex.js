import { lightbox } from 'wix-window-frontend';

$w.onReady(function () {
    const productImagesByColor = lightbox.getContext();
    $w('#colorSelections').data = productImagesByColor;
    $w('#colorSelections').onItemReady(($item, itemData, index) => {
        $item('#colorSelectionImage').src = itemData.mainMedia;
        $item('#colorSelectionImage').alt = itemData.mainMediaAltText;
        $item('#colorSelectionText').text = itemData.color;

        $item('#colorSelectionItem').onClick(() => {
            setTimeout(() => {
                lightbox.close(itemData);
            }, 500)
        })
    })
    $w('#colorSelections').expand();
});