import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, map } from 'rxjs';
import { AuthService, User } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { Message } from '../../../models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {
  currentUser: User | null = null;
  messages$: Observable<Message[]> = of([]);
  newMessage = '';

  constructor(
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.messages$ = this.chatService.messages$.pipe(
          map(msgs => msgs.filter(m => m.receiverId === user.id || m.senderId === user.id))
        );
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.currentUser) return;
    
    // In this mock, we send to a generic 'citizen_user' or similar
    this.chatService.sendMessage('citizen_user', this.newMessage);
    this.newMessage = '';
  }
}
