import { useScope } from 'repeater-scope';
import { lightbox } from 'wix-window-frontend';

$w.onReady(function () {
    const pageState = lightbox.getContext();

    let _currentModelInfo = pageState._currentModelInfo;
    let _currentImagesOfProduct = pageState._currentImagesOfProduct;
    let _currentChoices = pageState._currentChoices;

    $w('#totalColourOptions').text = `${pageState.productImagesByColor.length} Colours`;
    $w('#colorSelections').data = pageState.productImagesByColor;


    $w('#colorSelections').onItemReady(($item, itemData, index) => {
        $item('#colorSelectionImage').src = itemData.images[itemData.images.length - 2].src;
        $item('#colorSelectionImage').alt = itemData.images[itemData.images.length - 2].alt;
        $item('#colorSelectionText').html = `<p style="background-color:${itemData.value};">${itemData.color}</p>`;

        // Remember selected color and keep it as selected in style
        const selectedColor = pageState._currentChoices["Color"];
        if (selectedColor === itemData.color) {
            $item("#colorSelectionItem").customClassList.add("selected-color");
        }
    });

    $w('#colorSelectionItem').onClick((event) => {
        const { itemData, $item } = useScope(event);

        _currentModelInfo = itemData.model;
        _currentImagesOfProduct = itemData.images;

        // Update Selections
        _currentChoices = { ..._currentChoices, "Color": itemData.color };

        // Remove same class for all items first then add the selected one and update style via this way
        $w("#colorSelectionItem").customClassList.remove("selected-color");
        $item("#colorSelectionItem").customClassList.add("selected-color");


        setTimeout(() => {
            lightbox.close({
                _currentModelInfo,
                _currentImagesOfProduct,
                _currentChoices,
                selectedColorData: itemData
            });
        }, 150);
    })

    $w('#colorSelections').expand();
});