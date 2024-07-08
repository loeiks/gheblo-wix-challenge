import weivData from '@exweiv/weiv-data';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSecretValue } from '@exweiv/wix-secret-helpers';
import { webMethod, Permissions } from 'wix-web-module';
import { validateParamsExists } from 'backend/Helpers/validator';

export const getSuggestedPrompts = webMethod(Permissions.Anyone, async () => {
    try {
        // Check estimated total counts of documents
        const estimatedDocumentCount = await (await weivData.native("Gheblo/AIChatPromptsHistory", true)).estimatedDocumentCount();

        if (estimatedDocumentCount > 50) {
            //@ts-ignore
            const { items } = await weivData.aggregate("Gheblo/AIChatPromptsHistory").stage([
                {
                    $group: {
                        "_id": "$prompt",
                        "count": { $sum: 1 }
                    }
                },
                {
                    $sort: { "count": -1 }
                },
                {
                    $limit: 5
                }
            ]).run({ suppressAuth: true });

            return items.map((prompt) => {
                return {
                    label: prompt,
                    value: prompt
                }
            });
        } else {
            return [
                {
                    label: "What are the materials of this product?",
                    value: "What are the materials of this product?"
                },
                {
                    label: "Which size should I wear?",
                    value: "Which size should I wear?"
                },
                {
                    label: "What about washing?",
                    value: "What about washing?"
                }
            ]
        }
    } catch (err) {
        throw new Error(`Error when fetching suggested prompts, ${err}`);
    }
}, {
    cache: {
        tags: ["ai-suggested-chat-prompts"],
        ttl: 86400
    }
});


export const getGenAIResponse = webMethod(Permissions.Anyone,
    async (prompt, productData, history) => {
        try {
            // Check required parameters are provided
            validateParamsExists(__filename, "getGenAIResponse", prompt, productData, history);

            const geminiAPIKey = await getSecretValue("GoogleGeminiAPIKey");
            const genAI = new GoogleGenerativeAI(geminiAPIKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            const clearedHistory = history.map((h) => {
                return {
                    role: h.role,
                    parts: h.parts
                }
            })

            const chatHistory = [
                {
                    role: "user",
                    parts: [{ text: "You are an agent in a website where you help visitors about the product details and questions directly related or un-directly questions with product." }]
                },
                {
                    role: "model",
                    parts: [{ text: `Here's what I know about the product...\n${JSON.stringify(productData)}` }]
                },
                {
                    role: "user",
                    parts: [{ text: "Nice job! Remember the product data is in JSON format and includes many details about the current product only, there  might be different products in the store but you don't know about them yet. Now you are ready to answer the visitor's questions." }],
                },
                ...clearedHistory
            ];

            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            const text = response.text();

            return text;
        } catch (err) {
            throw new Error(`Error when trying to get an answer from Gemini AI, ${err}`);
        }
    });