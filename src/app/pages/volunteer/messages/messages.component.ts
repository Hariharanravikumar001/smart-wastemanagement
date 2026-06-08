import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Observable, of, map, combineLatest } from 'rxjs';
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
  opportunityId?: string;
  opportunityTitle?: string;
}

import { ChatComponent } from '../../chat/chat.component';

@Component({
  selector: 'app-volunteer-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ChatComponent],
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
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadConversations();
      }
    });

    // Check query params for starting a new chat
    this.route.queryParams.subscribe(params => {
      if (params['partnerId'] && params['partnerName']) {
        const newPartner: ChatConversation = {
          partnerId: params['partnerId'],
          partnerName: params['partnerName'],
          lastMessage: 'New Conversation...',
          lastMessageTime: new Date(),
          unreadCount: 0
        };
        // Ensure conversations$ updates if this partner isn't found
        this.conversations$ = this.conversations$.pipe(
          map(convs => {
            const exists = convs.find(c => c.partnerId === newPartner.partnerId);
            if (!exists) {
              return [newPartner, ...convs];
            }
            return convs;
          })
        );
        this.selectConversation(newPartner);
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
    const queryParams: any = {};
    if (partner.opportunityId) {
      queryParams.opportunityId = partner.opportunityId;
    }
    this.router.navigate(['/chat', partner.partnerId, partner.partnerName], { queryParams });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedPartner) return;
    
    this.chatService.sendMessage(this.selectedPartner.partnerId, this.newMessageContent);
    this.newMessageContent = '';
    this.scrollToBottom();
  }

  // --- Rich Messaging Features ---

  showEmojiPicker = false;
  emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '🗑️', '♻️'];

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessageContent += emoji;
    this.showEmojiPicker = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.selectedPartner) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        this.chatService.sendMessage(this.selectedPartner!.partnerId, '📷 Image attached', 'image', base64Image);
        this.scrollToBottom();
      };
      reader.readAsDataURL(file);
    }
  }

  shareLocation(): void {
    if (!this.selectedPartner) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          this.chatService.sendMessage(this.selectedPartner!.partnerId, '📍 Shared a location', 'location', locationUrl);
          this.scrollToBottom();
        },
        (error) => {
          alert('Error getting location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  isRecording = false;
  mediaRecorder: any = null;
  audioChunks: any[] = [];

  async toggleRecording(): Promise<void> {
    if (!this.selectedPartner) return;
    
    if (this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.addEventListener('dataavailable', (event: any) => {
          this.audioChunks.push(event.data);
        });

        this.mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            this.chatService.sendMessage(this.selectedPartner!.partnerId, '🎤 Voice Message', 'audio', base64Audio);
            this.scrollToBottom();
          };
          stream.getTracks().forEach(track => track.stop());
        });

        this.mediaRecorder.start();
        this.isRecording = true;
      } catch (err) {
        alert('Could not access microphone: ' + err);
      }
    }
  }

  // --- End Rich Messaging Features ---

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
