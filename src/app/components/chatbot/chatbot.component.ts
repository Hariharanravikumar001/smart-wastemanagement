import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  isOpen = false;
  messages: ChatMessage[] = [];
  userInput = '';
  isTyping = false;

  constructor(private http: HttpClient, private translate: TranslateService) {}

  ngOnInit(): void {
    this.resetChat();
    
    // Refresh greeting language dynamically on language toggle
    this.translate.onLangChange.subscribe(() => {
      if (this.messages.length <= 1) {
        this.resetChat();
      }
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.resetChat();
    }
  }

  resetChat(): void {
    this.messages = [];
    const greetingKey = 'CHATBOT.GREETING';
    this.translate.get(greetingKey).subscribe((translation: string) => {
      this.messages.push({
        text: translation,
        isBot: true,
        timestamp: new Date()
      });
    });
  }

  sendMessage(text?: string): void {
    const messageToSend = text || this.userInput;
    if (!messageToSend.trim()) return;

    // Display user message in chat
    this.messages.push({
      text: messageToSend,
      isBot: false,
      timestamp: new Date()
    });

    if (!text) {
      this.userInput = '';
    }

    this.scrollToBottom();
    this.isTyping = true;

    // Send query to backend chatbot
    const activeLang = this.translate.currentLang || 'en';
    this.http.post<any>('/api/ai/chatbot', {
      message: messageToSend,
      lang: activeLang
    }).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.messages.push({
          text: response.message,
          isBot: true,
          timestamp: new Date()
        });
        this.scrollToBottom();
      },
      error: (error) => {
        this.isTyping = false;
        console.error('Error querying chatbot:', error);
        
        const errorMsg = activeLang === 'ta' 
          ? 'மன்னிக்கவும், சேவையகத்துடன் இணைப்பதில் சிக்கல் உள்ளது.' 
          : activeLang === 'hi' 
            ? 'क्षमा करें, सर्वर से जुड़ने में समस्या आ रही है।' 
            : 'Sorry, I am having trouble connecting to the server.';
            
        this.messages.push({
          text: errorMsg,
          isBot: true,
          timestamp: new Date()
        });
        this.scrollToBottom();
      }
    });
  }

  sendPresetQuestion(questionKey: string): void {
    this.translate.get(questionKey).subscribe((qText: string) => {
      this.sendMessage(qText);
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const chatBody = document.getElementById('chatbot-body');
      if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }, 100);
  }
}
