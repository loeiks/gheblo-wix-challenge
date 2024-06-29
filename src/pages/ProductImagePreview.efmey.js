import { lightbox } from 'wix-window-frontend';

$w.onReady(function () {
    let counter = 0;
    const images = lightbox.getContext();
    $w('#currentImage').src = images[0].src;
    $w('#imageSliderRepeater').data = images;

    $w('#imageSliderRepeater').onItemReady(($item, itemData, index) => {
        $item("#imagePreview").src = itemData.src;
        $item('#previewBox').onClick(() => {
            $w('#currentImage').src = itemData.src;
            counter = index;
        })
    })

    $w('#nextImage').onClick(() => {
        if (counter < images.length - 1) {
            counter++;
            $w('#currentImage').src = images[counter].src;
        }
    });
    $w('#previousImage').onClick(() => {
        if (counter > 0) {
            counter--;
            $w('#currentImage').src = images[counter].src;
        }
    });
});