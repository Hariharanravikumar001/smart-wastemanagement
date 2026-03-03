import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService, User } from '../../services/auth.service';
import { Message } from '../../models/message.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIf, NgFor, NgClass, DatePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  newMessage = '';
  receiverId: string | null = null;
  receiverName = 'Organization';
  currentUser: User | null = null;
  private chatSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    this.route.paramMap.subscribe(params => {
      this.receiverId = params.get('userId');
      const name = params.get('name');
      if (name) this.receiverName = name;

      if (this.currentUser && this.receiverId) {
        if (this.chatSub) this.chatSub.unsubscribe();
        
        this.chatSub = this.chatService.getChatMessages(this.currentUser.id, this.receiverId)
          .subscribe(msgs => {
            this.messages = msgs;
            this.scrollToBottom();
          });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.chatSub) this.chatSub.unsubscribe();
  }

  onSendMessage(): void {
    if (this.newMessage.trim() && this.receiverId) {
      this.chatService.sendMessage(this.receiverId, this.newMessage);
      this.newMessage = '';
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}
