import { GoogleGenerativeAI } from '@google/generative-ai';
import { webMethod, Permissions } from 'wix-web-module';
import { searchInSupportArticles } from './support_system.web';
import { getSecretValue } from '@exweiv/wix-secret-helpers';
import { marked } from 'marked';

export const getAISupport = webMethod(Permissions.Anyone, async (searchQuery) => {
    try {
        const relatedArticles = await searchInSupportArticles(searchQuery, 5);

        const formattedArticles = relatedArticles.map((article) => {
            return {
                title: article.title,
                content: article.plainContent,
                articleUrl: `https://gheblo.com/support/article/${article.slug}`
            }
        });

        const geminiAPIKey = await getSecretValue("GoogleGeminiAPIKey");
        const genAI = new GoogleGenerativeAI(geminiAPIKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
            systemInstruction: aiPrompts.intro
        });

        const chatHistory = [
            {
                role: "user",
                parts: [{ text: "Do you have the article data?" }]
            },
            {
                role: "model",
                parts: [{ text: `Yes I have the articles that's related with the user's question, here: ${JSON.stringify(formattedArticles)}` }]
            },
            {
                role: "user",
                parts: [{ text: "Nice! You have the related articles to answer user question, but before you answer I want you to tell me more about Gheblo." }]
            },
            {
                role: "model",
                parts: [{ text: `Of course here is some general information about Gheblo: ${aiPrompts["brandData"]}` }]
            },
            {
                role: "model",
                parts: [{ text: aiPrompts["readyToAnswer"] }]
            }
        ]

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(searchQuery);
        const response = await result.response;
        const text = response.text();

        marked.setOptions({
            breaks: true
        })

        return marked(text);
    } catch (err) {
        throw new Error(`Error when fetching AI support, ${err}`);
    }
});

const aiPrompts = {
    intro: `You are here to answer support center questions for members/visitors of Gheblo (Gheblo is a fashion and apparel brand). When answering questions you will have some related articles in JSON format.
    
    You may have more than one JSON (maximum 5) which means there are more than one related article to question. Each JSON will contain some details about the article, including the full text of the article.

    *Each JSON will contain the following fields:*

    - title: Title of the article.
    - content: Full text of the article.
    - articleUrl: URL of the article.

    ---
    
    When answering questions be as clear as possible and reference articles using the "articleUrl" value which placed in each JSON data. Use the template below when answering to questions:\n
    
    [your answer here]
    
    <br/><br/> (empty line here)

    Related Articles:
    [articleUrl](articleUrl)
    
    So template is above, when referencing articles use [articleUrl](articleUrl) template in markdown link style.`,

    brandData: `Brand name: Gheblo,\nBrand industry: Fashion and Apparel,\nBrand website: www.gheblo.com\nBrand location: Istanbul, Turkey\nBrand email: info@gheblo.com\nBrand phone: +90 540 100 2000.\n\n
    Gheblo is a brand owned by ExWeiv and HQ is located in Istanbul, Turkey. Gheblo is a fashion and apparel brand that focuses on bringing unique experince and products to the market.`,

    readyToAnswer: `Nice job! Now you are ready to answer the support center questions asked by Gheblo members/visitors. Remember you will have JSON data for each article, and if there are more than one you will get all of them inside of an array. Now you can answer the question based on the instoructions we've talked before.
    
    **Use markdown to style your answer to make it easy to read with line breaks and other styling features.**

    When using Markdown keep in mind:
    - No need for style attributes, do not add any style or class attributes. We will handle CSS.
    - Use <br/> for empty lines and making text clear and easy to read.
    - Use related markdown elements to style the answer.
    - For headings only use ##### and ###### not anything else. (h5 and h6)
    - Use [articleUrl](articleUrl) template to reference articles when needed. So link is visible and clickable.
    
    **If you can't find any information in the articles, respond with this: Sorry I wasn't able to find an answer for your question: [**question here**].`,
}