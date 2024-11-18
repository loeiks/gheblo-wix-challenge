import { to } from 'wix-location-frontend';
import { local } from 'wix-storage-frontend';

$w.onReady(function () {
    $w('#searhInput').onKeyPress((event) => {
        if (event.key === "Enter" && event.target.valid) {
            addToHistory(event.target.value);
            to(`https://exweiv.wixstudio.io/gheblo/search?q=${event.target.value}`);
        }
    })

    const history = JSON.parse(local.getItem("search_history"));

    if (history) {
        $w('#searchHistory').options = history.map((item) => {
            return {
                label: item,
                value: item
            }
        });

        $w('#searchHistory').expand();
    }

    $w('#searchHistory').onChange(({ target }) => {
        to(`https://exweiv.wixstudio.io/gheblo/search?q=${target.value}`);
    });

    $w('#searchInput').onClick(() => {
        const searchQuery = $w('#searhInput').value;
        if (searchQuery.length > 2) {
            to(`https://exweiv.wixstudio.io/gheblo/search?q=${$w('#searhInput').value}`);
        }
    })
});

function addToHistory(value) {
    const history = JSON.parse(local.getItem("search_history"));

    if (history) {
        if (!history.includes(value)) {
            history.push(value);
            local.setItem("search_history", JSON.stringify(history));
        }
    } else {
        local.setItem("search_history", JSON.stringify([value]));
    }
}