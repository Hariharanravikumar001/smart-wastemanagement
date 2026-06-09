"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotResponse = exports.detectWaste = void 0;
// Mock AI Waste Detection Controller
const detectWaste = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            res.status(400).json({ message: 'Image data is required' });
            return;
        }
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Simple mock logic based on random selection to simulate a real ML model
        const categories = ['Plastic', 'Organic', 'E-waste', 'Metal', 'Paper', 'Glass', 'Hazardous'];
        const randomIndex = Math.floor(Math.random() * categories.length);
        const detectedCategory = categories[randomIndex];
        const confidence = (Math.random() * (0.99 - 0.75) + 0.75).toFixed(2); // Random confidence between 75% and 99%
        res.status(200).json({
            message: 'Waste detected successfully',
            category: detectedCategory,
            confidence: parseFloat(confidence)
        });
    }
    catch (error) {
        console.error('Error in AI Waste Detection:', error);
        res.status(500).json({ message: 'Internal server error during AI detection' });
    }
};
exports.detectWaste = detectWaste;
// AI Chatbot Controller (Multilingual context-rich response handler)
const chatbotResponse = async (req, res) => {
    try {
        const { message, lang = 'en' } = req.body;
        if (!message) {
            res.status(400).json({ message: 'Message is required' });
            return;
        }
        const msgLower = message.toLowerCase();
        // Categorize intent based on keywords across English, Tamil, and Hindi
        let intent = 'FALLBACK';
        if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey') ||
            msgLower.includes('வணக்கம்') || msgLower.includes('உதவி') ||
            msgLower.includes('नमस्ते') || msgLower.includes('मदद') || msgLower.includes('help')) {
            intent = 'GREETING';
        }
        else if (msgLower.includes('pickup') || msgLower.includes('schedule') || msgLower.includes('collect') ||
            msgLower.includes('பிக்கப்') || msgLower.includes('திட்டமிடு') ||
            msgLower.includes('पिकअप') || msgLower.includes('शेड्यूल')) {
            intent = 'PICKUP';
        }
        else if (msgLower.includes('reward') || msgLower.includes('point') || msgLower.includes('badge') || msgLower.includes('coupon') ||
            msgLower.includes('பரிசு') || msgLower.includes('புள்ளிகள்') ||
            msgLower.includes('पुरस्कार') || msgLower.includes('पॉइंट') || msgLower.includes('बैज')) {
            intent = 'REWARDS';
        }
        else if (msgLower.includes('volunteer') || msgLower.includes('ngo') || msgLower.includes('project') || msgLower.includes('opportunity') ||
            msgLower.includes('தன்னார்வ') || msgLower.includes('வாய்ப்பு') ||
            msgLower.includes('स्वयंसेवक') || msgLower.includes('अवसर')) {
            intent = 'VOLUNTEER';
        }
        else if (msgLower.includes('segregate') || msgLower.includes('sort') || msgLower.includes('separate') || msgLower.includes('organic') || msgLower.includes('plastic') ||
            msgLower.includes('பிரி') || msgLower.includes('குப்பை') ||
            msgLower.includes('अलग') || msgLower.includes('कचरा')) {
            intent = 'SEGREGATE';
        }
        else if (msgLower.includes('ai') || msgLower.includes('scan') || msgLower.includes('detect') || msgLower.includes('camera') || msgLower.includes('image') ||
            msgLower.includes('கண்டறி') ||
            msgLower.includes('स्कैन') || msgLower.includes('पहचान')) {
            intent = 'AI';
        }
        // Response matrix for intent vs language
        const responses = {
            GREETING: {
                en: "Hello! I am EcoBot, your smart waste assistant. How can I help you today? You can ask me about scheduling pickups, earning rewards, volunteering with NGOs, or sorting waste.",
                ta: "வணக்கம்! நான் ஈக்கோபாட் (EcoBot), உங்கள் சுற்றுச்சூழல் உதவியாளர். இன்று உங்களுக்கு நான் எவ்வாறு உதவ முடியும்? பிக்கப் திட்டமிடுதல், பரிசுகள், அல்லது குப்பைகளை பிரிப்பது பற்றி நீங்கள் என்னிடம் கேட்கலாம்.",
                hi: "नमस्ते! मैं इकोबॉट (EcoBot) हूँ, आपका स्मार्ट कचरा प्रबंधन सहायक। आज मैं आपकी क्या सहायता कर सकता हूँ? आप मुझसे पिकअप शेड्यूल करने, पुरस्कार अर्जित करने या कचरा अलग करने के बारे में पूछ सकते हैं।"
            },
            PICKUP: {
                en: "To schedule a pickup, log in as a Citizen, go to the **Schedule Pickup** page, specify the waste category, location, and description. You can also upload a photo of the waste. Once submitted, a volunteer will coordinate the pickup.",
                ta: "ஒரு பிக்கப்பைத் திட்டமிட, குடிமகனாக (Citizen) உள்நுழைந்து, **பிக்கப் திட்டமிடு** பக்கத்திற்குச் சென்று, கழிவு வகை, இருப்பிடம் மற்றும் விவரங்களைக் குறிப்பிடவும். நீங்கள் கழிவுகளின் படத்தையும் பதிவேற்றலாம். ஒரு தன்னார்வலர் அதை ஏற்றுக்கொள்வார்.",
                hi: "पिकअप शेड्यूल करने के लिए, नागरिक (Citizen) के रूप में लॉग इन करें, **पिकअप शेड्यूल करें** पेज पर जाएं, कचरा श्रेणी, स्थान और विवरण दर्ज करें। आप कचरे की फोटो भी अपलोड कर सकते हैं। एक स्वयंसेवक इसे स्वीकार करेगा।"
            },
            REWARDS: {
                en: "You earn **50 reward points** for every completed pickup request! Points can be redeemed for local coupons in the rewards panel. You also unlock badges like **Eco Starter** (100 points) and **Recycling Champion** (500 points).",
                ta: "ஒவ்வொரு வெற்றிகரமான பிக்கப்பிற்கும் நீங்கள் **50 பரிசு புள்ளிகளை** பெறுவீர்கள்! இந்த புள்ளிகளைக் கொண்டு நீங்கள் உள்ளூர் கூப்பன்களைப் பெறலாம். மேலும் **Eco Starter** (100 புள்ளிகள்) மற்றும் **Recycling Champion** (500 புள்ளிகள்) பேட்ஜ்களையும் பெறலாம்.",
                hi: "प्रत्येक पूर्ण पिकअप के लिए आप **50 रिवॉर्ड पॉइंट** अर्जित करते हैं! इन पॉइंट्स का उपयोग आप इनाम पैनल में कूपन भुनाने के लिए कर सकते हैं। आप **Eco Starter** (100 पॉइंट्स) और **Recycling Champion** (500 पॉइंट्स) जैसे बैज भी अनलॉक कर सकते हैं।"
            },
            VOLUNTEER: {
                en: "Volunteers can browse and apply for eco-cleanup projects on the **Opportunities** page. Once the NGO accepts your application, messaging features will be unlocked. Once completed, the communication history is automatically soft-deleted for privacy.",
                ta: "தன்னார்வலர்கள் (Volunteers) **Opportunities** பக்கத்தில் சுற்றுச்சூழல் சுத்தம் செய்யும் திட்டங்களை உலாவலாம். NGO உங்கள் விண்ணப்பத்தை ஏற்றதும், அரட்டை அம்சம் திறக்கப்படும். பணி முடிந்ததும், உங்கள் தனியுரிமைக்காக அரட்டை தானாகவே நீக்கப்படும்.",
                hi: "स्वयंसेवक **अवसर (Opportunities)** पेज पर सफाई परियोजनाओं को देख सकते हैं और आवेदन कर सकते हैं। एनजीओ द्वारा आवेदन स्वीकार करने के बाद, चैट विकल्प चालू हो जाएगा। काम पूरा होने पर, गोपनीयता के लिए चैट इतिहास अपने आप हटा दिया जाएगा।"
            },
            SEGREGATE: {
                en: "Proper waste segregation is key to recycling:\n- **Organic**: Food waste, fruit peels (compostable).\n- **Plastic/Paper/Glass**: Clean recyclables.\n- **E-waste/Hazardous**: Batteries, electronics (needs safe disposal).",
                ta: "கழிவுகளை சரியாக பிரிப்பது மறுசுழற்சிக்கு முக்கியமானது:\n- **ஆர்கானிக்**: உணவு கழிவுகள், பழத்தோல்கள் (உரமாக்கக்கூடியவை).\n- **பிளாஸ்டிக்/காகிதம்/கண்ணாடி**: சுத்தம் செய்த மறுசுழற்சி பொருட்கள்.\n- **மின்னணு கழிவுகள்/அபாயகரமானவை**: பேட்டரிகள், மின்சாதனங்கள் (பாதுகாப்பாக அகற்றப்பட வேண்டும்).",
                hi: "कचरे का सही वर्गीकरण पुनर्चक्रण के लिए महत्वपूर्ण है:\n- **जैविक (Organic)**: बचा हुआ भोजन, फलों के छिलके (खाद बनाने योग्य)।\n- **प्लास्टिक/कागज/कांच**: साफ रीसाइक्लिंग सामग्री।\n- **ई-कचरा/असुरक्षित**: बैटरी, इलेक्ट्रॉनिक्स उपकरण (सुरक्षित निपटान की आवश्यकता है)।"
            },
            AI: {
                en: "Our built-in AI Waste Detector scans uploaded images to classify waste type. When scheduling a pickup, upload a photo, and the AI will predict categories like Plastic, Organic, Metal, Paper, or Glass along with a confidence rating (e.g., 92%).",
                ta: "எங்கள் உள்ளமைக்கப்பட்ட AI கழிவு கண்டறிவி பதிவேற்றப்பட்ட படங்களை ஸ்கேன் செய்து கழிவு வகையை வகைப்படுத்துகிறது. பிக்கப்பைத் திட்டமிடும்போது ஒரு புகைப்படத்தைப் பதிவேற்றவும், AI அதன் வகையை கணித்து தரும்.",
                hi: "हमारा अंतर्निहित AI कचरा डिटेक्टर कचरे के प्रकार को वर्गीकृत करने के लिए अपलोड की गई छवियों को स्कैन करता है। पिकअप शेड्यूल करते समय फोटो अपलोड करें, और AI आत्मविश्वास रेटिंग (जैसे, 92%) के साथ श्रेणियों की भविष्यवाणी करेगा।"
            },
            FALLBACK: {
                en: "I'm sorry, I didn't quite catch that. You can ask me about scheduling a pickup, reward points, volunteering with NGOs, or how to use the AI waste scanner. Try typing keywords like 'pickup', 'rewards', 'segregate', or 'volunteer'!",
                ta: "மன்னிக்கவும், எனக்கு புரியவில்லை. பிக்கப் திட்டமிடல், பரிசு புள்ளிகள், NGO வாய்ப்புகள், குப்பை பிரித்தல் அல்லது AI ஸ்கேனர் பற்றி என்னிடம் கேளுங்கள். 'பிக்கப்', 'பரிசு', 'பிரி' அல்லது 'தன்னார்வலர்' போன்ற வார்த்தைகளைப் பயன்படுத்திப் பார்க்கவும்!",
                hi: "क्षमा करें, मैं समझ नहीं पाया। आप मुझसे पिकअप शेड्यूल, रिवॉर्ड पॉइंट, एनजीओ अवसर, कचरा अलग करने या AI स्कैनर के बारे में पूछ सकते हैं। कृपया 'पिकअप', 'पुरस्कार', 'अलग' या 'स्वयंसेवक' जैसे कीवर्ड टाइप करें!"
            }
        };
        const targetLang = responses[intent][lang] ? lang : 'en';
        const reply = responses[intent][targetLang];
        res.status(200).json({
            message: reply,
            intent,
            lang: targetLang
        });
    }
    catch (error) {
        console.error('Error in AI Chatbot:', error);
        res.status(500).json({ message: 'Internal server error during chatbot query' });
    }
};
exports.chatbotResponse = chatbotResponse;
