import weivData from '@exweiv/weiv-data';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSecretValue } from '@exweiv/wix-secret-helpers';
import { webMethod, Permissions } from 'wix-web-module'; //@ts-ignore
import { validateParamsExists } from '../Helpers/validator'; //@ts-ignore
import { aiChatPrompts } from './ai_prompts';
import { queryReviewsForAI, getProductReviewRatingDetails } from 'backend/Reviews/reviews.web';
import { getProductQuestions } from 'backend/Questions/query.web';
import NodeCache from 'node-cache';
import moment from 'moment';
import { omit } from 'lodash';

const productAiDataCache = new NodeCache({ stdTTL: 60 * 10, deleteOnExpire: true, arrayValueSize: 21, useClones: false });

export const getSuggestedPrompts = webMethod(Permissions.Anyone, async (productSlug) => {
    try {
        // Check estimated total counts of documents
        const documentCount = await (await weivData.native("Gheblo/AIChatPromptsHistory", true)).countDocuments({
            "productSlug": {
                $eq: productSlug
            }
        });

        if (documentCount > 50) {
            const { items } = await weivData.aggregate("Gheblo/AIChatPromptsHistory").stage(
                {
                    $match: {
                        "productSlug": {
                            $eq: productSlug
                        }
                    }
                },
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
                    $limit: 4
                }
            ).run({ suppressAuth: true });

            return items.map((item) => {
                return {
                    label: item.prompt,
                    value: item.prompt
                }
            });
        } else {
            return [
                {
                    label: "What are the materials of this product?",
                    value: "What are the materials of this product?"
                },
                {
                    label: "Do you have all options in stock?",
                    value: "Do you have all options in stock?"
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

export const getGenAIResponse = webMethod(Permissions.Anyone, async (prompt, productData, history) => {
    try {
        // Check required parameters are provided
        validateParamsExists(__filename, "getGenAIResponse", prompt, productData, history);
        await weivData.insert("Gheblo/AIChatPromptHistory", { prompt, productSlug: productData.slug }, { suppressAuth: true, suppressHooks: true });

        if (!productAiDataCache.get(productData.slug)) {
            const reviewsOfProduct = await queryReviewsForAI(productData.slug);
            const reviewsRating = await getProductReviewRatingDetails(productData.slug)
            const questionsAndRepliesOfProduct = await getProductQuestions(productData.slug, 0, 10);

            // Handle Reviews Data
            let reviewItems = [];
            if (reviewsOfProduct["totalReviews"] > 0) {
                reviewItems = reviewsOfProduct["items"].map((review) => {
                    return {
                        _owner: review._owner,
                        reviewText: review.content.body,
                        reviewRating: review.content.rating,
                        imagesCount: review.content.media?.length || 0
                    }
                });
            }

            const reviewsData = {
                reviews: reviewItems,
                totalReviews: reviewsOfProduct["totalReviews"],
                reviewsRatingsStats: reviewsRating
            }

            // Handle Questions Data
            let questions = questionsAndRepliesOfProduct["questions"].map((question) => {
                return {
                    _createdDate: moment(question._createdDate).format("DD/MMM/YYYY HH:mm").toString(),
                    _updatedDate: moment(question._updatedDate).format("DD/MM/YYYY HH:mm").toString(),
                    _owner: question._owner,
                    questionText: question.text,
                    answers: question.replies.map((answer) => {
                        return {
                            _createdDate: moment(answer._createdDate).format("DD/MMM/YYYY HH:mm").toString(),
                            _updatedDate: moment(answer._updatedDate).format("DD/MM/YYYY HH:mm").toString(),
                            _owner: answer._owner,
                            answerText: answer.text
                        }
                    })
                }
            });

            productAiDataCache.set(productData.slug, {
                reviewsData: reviewsData,
                questionsData: questions
            });
        }

        const { reviewsData, questionsData } = productAiDataCache.get(productData.slug);
        let aiProductData = omit(productData, [
            "collections",
            "createdDate",
            "discountedPrice",
            "formattedPricePerUnit",
            "inventoryItem",
            "mainMedia",
            "manageVariants",
            "mediaItems",
            "pricePerUnit",
            "pricePerUnitData",
            "productImagesByColor",
            "productPageUrl",
            "seoData",
            "sku",
            "trackInventory",
            "weight",
            "_updatedDate",
            "variants"
        ]);

        aiProductData = {
            ...aiProductData,
            productVariants: aiProductData.productVariants.map((variant) => {
                return {
                    choices: variant.choices,
                    fullVariantName: variant.fullVariantName,
                    sku: variant.sku,
                    stock: {
                        ...variant.stock,
                        quantity: variant.stock?.quantity || 0
                    },
                    variantId: variant.variantId,
                    variantName: variant.variantName,
                    _id: variant._id,
                    formattedDiscountedPrice: aiProductData.formattedDiscountedPrice,
                    formattedPrice: aiProductData.formattedPrice,
                }
            })
        }

        const geminiAPIKey = await getSecretValue("GoogleGeminiAPIKey");
        const genAI = new GoogleGenerativeAI(geminiAPIKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
            systemInstruction: aiChatPrompts.intro
        });

        const clearedHistory = history.map((h) => {
            return {
                role: h.role,
                parts: h.parts
            }
        });

        const chatHistory = [
            {
                role: "user",
                parts: [{ text: "Do you have the product data?" }]
            },
            {
                role: "model",
                parts: [{ text: `Here's what I know about the product in JSON format;\n${JSON.stringify(aiProductData)}` }]
            },
            {
                role: "user",
                parts: [{ text: aiChatPrompts["reviewsAccess"] }]
            },
            {
                role: "model",
                parts: [{ text: `Yes! I have access to reviews of product too here is what I have in JSON format;\n${JSON.stringify(reviewsData)}` }]
            },
            {
                role: "user",
                parts: [{ text: aiChatPrompts["questionsAccess"] }]
            },
            {
                role: "model",
                parts: [{ text: `Yes I also have access to questions and their replies data which is usually created by Gheblo members, here is what I have in JSON format;\n${JSON.stringify(questionsData)}` }]
            },
            {
                role: "user",
                parts: [{ text: aiChatPrompts["brandDataAccess"] }]
            },
            {
                role: "model",
                parts: [{ text: `Yes I have information about the brand details and here are they;\n${aiChatPrompts["brandData"]}` }]
            },
            {
                role: "user",
                parts: [{ text: aiChatPrompts["productPageAccess"] }]
            },
            {
                role: "model",
                parts: [{ text: aiChatPrompts["productPageFeatures"] }]
            },
            {
                role: "user",
                parts: [{ text: aiChatPrompts["readyToAnswer"] }],
            },
            ...clearedHistory
        ];

        // const tokens = getTokenCount(chatHistory)
        // console.log(`The history has ${tokens} tokens.`);

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        return text;
    } catch (err) {
        throw new Error(`Error when trying to get an answer from Gemini AI, ${err}`);
    }
});

function getTokenCount(chatHistory) {
    let tokens = 0;
    for (const part of chatHistory) {
        tokens = tokens + estimateTokenCount(part.parts[0].text)
    }
    return tokens;
}

function estimateTokenCount(text) {
    const characterCount = text.length;
    const estimatedTokens = Math.floor(characterCount * (1 / Math.E) + 2);
    return estimatedTokens;
}