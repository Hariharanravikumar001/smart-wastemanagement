"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedback = exports.submitFeedback = void 0;
const Feedback_1 = __importDefault(require("../models/Feedback"));
const sentiment_1 = __importDefault(require("sentiment"));
const https_1 = __importDefault(require("https"));
const User_1 = __importDefault(require("../models/User"));
const sentiment = new sentiment_1.default();
const analyzeFeedbackWithGemini = (content, apiKey) => {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            contents: [{
                    parts: [{
                            text: `Analyze the following user feedback from our waste management app. Categorize it as "URGENT" if it contains safety issues, volunteer misbehavior, missed collections, dangerous materials, or severe complaints. Otherwise, categorize it as "NORMAL". Respond with only the single word: "URGENT" or "NORMAL".\n\nFeedback: "${content}"`
                        }]
                }]
        });
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https_1.default.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const responseText = parsed.candidates[0].content.parts[0].text.toUpperCase();
                    if (responseText.includes('URGENT')) {
                        resolve('Urgent');
                    }
                    else {
                        resolve('Normal');
                    }
                }
                catch (e) {
                    console.error('Error parsing Gemini response, falling back to normal:', e);
                    resolve('Normal');
                }
            });
        });
        req.on('error', (err) => {
            console.error('Gemini API request error:', err);
            resolve('Normal');
        });
        req.write(data);
        req.end();
    });
};
const submitFeedback = async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        const user = await User_1.default.findById(userId);
        const userName = user ? user.name : 'Anonymous';
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        // AI Sentiment Analysis
        const result = sentiment.analyze(content);
        const isNegative = result.score < 0;
        let priority = 'Normal';
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            priority = await analyzeFeedbackWithGemini(content, apiKey);
        }
        else {
            // Fallback: search for keywords indicating urgent complaints
            const urgentKeywords = ['hazard', 'danger', 'spill', 'cheat', 'scam', 'rude', 'broken', 'accident', 'injury', 'fire', 'chemical', 'toxic', 'missed', 'never showed', 'fail'];
            const lowercaseContent = content.toLowerCase();
            const hasUrgentKeyword = urgentKeywords.some(kw => lowercaseContent.includes(kw));
            if (hasUrgentKeyword || isNegative) {
                priority = 'Urgent';
            }
        }
        const feedback = new Feedback_1.default({
            userId,
            userName,
            role,
            content,
            sentimentScore: result.score,
            sentimentComparative: result.comparative,
            isNegative,
            priority
        });
        await feedback.save();
        if (priority === 'Urgent') {
            console.warn(`🚨 [URGENT FEEDBACK ALERT] User ${userName} (${role}) submitted critical feedback: "${content}"`);
        }
        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    }
    catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.submitFeedback = submitFeedback;
const getFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback_1.default.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    }
    catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getFeedback = getFeedback;
