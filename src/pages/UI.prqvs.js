// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world

$w.onReady(function () {
    // Write your JavaScript here

    // To select an element by ID use: $w('#elementID')

    // Click 'Preview' to run your code

    $w('#uploadButton1').onChange((event) => {
        console.log(event);
    })

    $w('#button12').onClick(() => {
        $w('#uploadButton1').uploadFiles()
            .then((files) => {
                console.log("Upload complete!", files)
            })
            .catch((err) => {
                console.error(err);
            })
    })
});