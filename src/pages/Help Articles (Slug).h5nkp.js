import { reportFeedback } from 'backend/help-center.web.js';

$w.onReady(async function () {
    const item = await $w('#dynamicDataset').getCurrentItem();

    if (!item.richcontent) {
        $w('#richContentViewer1, #line3, #line4').collapse();
    }

    $w('#feedbackReportText').onClick(() => {
        $w('#feedbackBox').expand();
        $w('#submitFeedback').onClick(() => {
            reportFeedback(item._id, $w('#feedbackReport').value);
            $w('#feedbackReport').value = null;
            $w('#feedbackBox').collapse();
        })
    })
});