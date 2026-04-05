import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map } from 'rxjs';
import { AuthService, User } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '../../../models/message.model';

export interface ChatConversation {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

@Component({
  selector: 'app-volunteer-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class VolunteerMessagesComponent implements OnInit {
  currentUser: User | null = null;
  conversations$: Observable<ChatConversation[]> = of([]);

  // Chat state
  activeChatMessages: Message[] = [];
  selectedPartner: ChatConversation | null = null;
  newMessageContent = '';
  isChatLoading = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadConversations();
      }
    });

    // Subscribe to real-time messages
    this.chatService.messages$.subscribe(msgs => {
      if (this.selectedPartner) {
        this.activeChatMessages = msgs;
        this.scrollToBottom();
      }
    });
  }

  loadConversations(): void {
    this.conversations$ = this.chatService.getConversations().pipe(
      map(convs => convs.map(c => ({
        ...c,
        lastMessageTime: new Date(c.lastMessageTime)
      })))
    );
  }

  selectConversation(partner: ChatConversation): void {
    this.selectedPartner = partner;
    this.isChatLoading = true;
    this.chatService.getChatMessages(this.currentUser?.id || '', partner.partnerId).subscribe({
      next: (msgs) => {
        this.activeChatMessages = msgs;
        this.isChatLoading = false;
        this.scrollToBottom();
        this.chatService.markMessagesAsRead(partner.partnerId);
      },
      error: (err) => {
        console.error('Error loading chat:', err);
        this.isChatLoading = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedPartner) return;
    
    this.chatService.sendMessage(this.selectedPartner.partnerId, this.newMessageContent);
    this.newMessageContent = '';
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
