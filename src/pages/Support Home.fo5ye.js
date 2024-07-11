import { searchInSupportArticles } from 'backend/Support/support_system.web';
import { getAISupport } from 'backend/Support/ai_answer.web';
import { debounce } from 'lodash';
import { useScope } from 'repeater-scope';
import { createStoreon } from 'storeon-velo';
import { to, query } from 'wix-location-frontend';
import { getRouterData } from 'wix-window-frontend';
import { authentication } from 'wix-members-frontend';
import { setTitle } from 'wix-seo-frontend';
import { handleSupportHeader } from 'public/Support/header';

const supportStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });
};

const store = createStoreon([supportStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    initPage();
    return readyStore();
});

async function initPage() {
    setupStateEvents();

    const { currentMemberData } = getRouterData();
    setState({ currentMemberData });

    setTitle("Support Center | Gheblo");
    handleSupportHeader();

    if (query["search"]) {
        setState({ searchQueryFromURL: query["search"] });
    }
}

function setupStateEvents() {
    setEventListeners();

    connect("searchResults", ({ searchResults }) => {
        if (!searchResults) return null;
        $w('#searchResults').data = searchResults;

        if (searchResults.length > 0) {
            $w('#searchResults').expand(); //@ts-ignore
            $w('#noResult, #preloader').collapse();
        } else { //@ts-ignore
            $w('#searchResults, #preloader').collapse();
            $w('#noResult').expand();
        }
    });

    connect("aiAnswer", async ({ aiAnswer }) => {
        if (!aiAnswer) return null;
        //@ts-ignore
        $w('#aiAnswerText').html = aiAnswer;
        $w('#aiAnswerBox').expand();
    })

    connect("currentMemberData", ({ currentMemberData }) => {
        if (!currentMemberData) return null;
        if (!authentication.loggedIn()) return null;

        $w('#homeTitle').html = `<p>Do you need help, <span style="color:#006a63;">${currentMemberData.contactDetails.firstName}</span>?</p>`;
    });

    connect("searchQueryFromURL", ({ searchQueryFromURL }) => {
        if (!searchQueryFromURL) return null;
        $w('#searchInput').value = searchQueryFromURL;
        searchInSupport();
    });

    connect("searching", ({ searching }) => {
        if (!searching) return null;  //@ts-ignore
        $w('#searchResults, #noResult').collapse();
        $w('#preloader').expand();
    })
}

function setEventListeners() {
    $w('#searchInput').onInput((event) => { searchInSupport() });

    $w('#searchResults').onItemReady(($item, itemData, index) => {
        $item('#resultTitle').text = itemData.title;
        $item('#resultDescription').text = itemData.excerpt;
        $item('#minutesToRead').text = `${itemData.minutesToRead} minutes to read.`;
    });

    $w('#resultBox').onClick((event) => {
        const { itemData } = useScope(event);
        to(`/support/article/${itemData.slug}`);
    });

    $w('#aiAnswerButton').onClick(async (event) => {
        const searchQuery = $w('#searchInput').value;

        if (searchQuery.length > 0) {
            $w('#aiAnswerBox').expand();
            $w('#aiAnswerText').text = "AI is searching for the answer...";
            let secondTextTimeout = setTimeout(() => { $w('#aiAnswerText').text = "Searching related articles to answer..."; }, 2000);

            const answer = await getAISupport(searchQuery);
            clearTimeout(secondTextTimeout);
            setState({ aiAnswer: answer });
        }
    })
}

const searchInSupport = debounce(async () => {
    const value = $w('#searchInput').value;
    if (value.length > 1) {
        setState({ searching: true });
        const searchResults = await searchInSupportArticles(value);
        setState({ searchResults });
    } else {
        setState({ searchResults: [] });
    }
}, 800)