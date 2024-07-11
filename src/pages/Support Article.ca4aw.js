import { createStoreon } from 'storeon-velo';
import { getRouterData } from 'wix-window-frontend';
import { query } from 'wix-location-frontend';
import { setTitle } from 'wix-seo-frontend';
import { handleSupportHeader } from 'public/Support/header';


const supportArticleStore = (store) => {
    store.on("@changed", (state, change) => {
        if (query.dev) {
            console.log(change);
        }
    });
}

const store = createStoreon([supportArticleStore]);
const { connect, dispatch, getState, readyStore, setState } = store;

$w.onReady(function () {
    initPage();
    return readyStore();
});

function initPage() {
    const { article, currentMemberData } = getRouterData();
    setupStateEvents();

    setState({ article, currentMemberData });
}

function setupStateEvents() {
    setEventListeners();

    connect("article", ({ article }) => {
        if (!article) return null;

        setTitle(`${article.title} | Support Center | Gheblo`);
        handleSupportHeader(article.title);
        //@ts-ignore
        $w('#article').content = article.richContent;
        $w('#articleTitle').text = article.title;
    });
}

function setEventListeners() {
    $w('#talkWithSupportButton').onClick((event) => {
        $w('#wixChatBox').expand(); //@ts-ignore
        $w('#wixChatBox').maximize();
    })
}