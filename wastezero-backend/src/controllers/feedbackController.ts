import { Request, Response } from 'express';
import Feedback from '../models/Feedback';
import Sentiment from 'sentiment';
import https from 'https';
import User from '../models/User';

const sentiment = new Sentiment();

const analyzeFeedbackWithGemini = (content: string, apiKey: string): Promise<'Normal' | 'Urgent'> => {
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

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const responseText = parsed.candidates[0].content.parts[0].text.toUpperCase();
          if (responseText.includes('URGENT')) {
            resolve('Urgent');
          } else {
            resolve('Normal');
          }
        } catch (e) {
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

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const userId = (req as any).user.id;
    const role = (req as any).user.role;

    const user = await User.findById(userId);
    const userName = user ? user.name : 'Anonymous';

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // AI Sentiment Analysis
    const result = sentiment.analyze(content);
    const isNegative = result.score < 0;

    let priority: 'Normal' | 'Urgent' = 'Normal';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      priority = await analyzeFeedbackWithGemini(content, apiKey);
    } else {
      // Fallback: search for keywords indicating urgent complaints
      const urgentKeywords = ['hazard', 'danger', 'spill', 'cheat', 'scam', 'rude', 'broken', 'accident', 'injury', 'fire', 'chemical', 'toxic', 'missed', 'never showed', 'fail'];
      const lowercaseContent = content.toLowerCase();
      const hasUrgentKeyword = urgentKeywords.some(kw => lowercaseContent.includes(kw));
      if (hasUrgentKeyword || isNegative) {
        priority = 'Urgent';
      }
    }

    const feedback = new Feedback({
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
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFeedback = async (req: Request, res: Response) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
