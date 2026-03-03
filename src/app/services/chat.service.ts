import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Message } from '../models/message.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private readonly STORAGE_KEY = 'wastezero_messages';

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.loadMessages();
  }

  private loadMessages(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        this.messagesSubject.next(parsed);
      }
    }
  }

  private saveMessages(messages: Message[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
      this.messagesSubject.next(messages);
    }
  }

  getChatMessages(userId1: string, userId2: string): Observable<Message[]> {
    return this.messages$.pipe(
      map(messages => messages.filter(m => 
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))
    );
  }

  sendMessage(receiverId: string, content: string): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: receiverId,
      content: content,
      timestamp: new Date(),
      isAdmin: currentUser.role === 'Admin'
    };

    const currentMessages = this.messagesSubject.value;
    this.saveMessages([...currentMessages, newMessage]);

    // Notify (Simulation: Receiver would get this)
    this.notificationService.addNotification(
      'New Message',
      `You have a new message from ${currentUser.name}`,
      'info'
    );
  }
}
