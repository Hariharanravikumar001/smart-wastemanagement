import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map, tap, catchError, throwError } from 'rxjs';
import { Message } from '../models/message.model';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private userStatusSubject = new BehaviorSubject<{ userId: string, isOnline: boolean, lastActive?: Date } | null>(null);
  public userStatus$ = this.userStatusSubject.asObservable();
  private apiUrl = '/api/messages';
  
  private activePartnerId: string | null = null;
  private activeOpportunityId: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        if (!this.socket) {
          this.initSocket();
        }
        this.updateUnreadCountFromConversations();
      } else {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        this.messagesSubject.next([]);
        this.unreadCountSubject.next(0);
      }
    });
  }

  private updateUnreadCountFromConversations(): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.getConversations().subscribe({
      next: (conversations) => {
        const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
        this.unreadCountSubject.next(totalUnread);
      },
      error: (err) => console.error('Error fetching unread counts:', err)
    });
  }

  private initSocket(): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.socket = io({ path: '/socket.io' });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.socket?.emit('join', user.id);
    });

    this.socket.on('new_message', (msg: any) => {
      console.log('New message received via socket:', msg);
      const formattedMsg = this.formatMessage(msg);
      
      // Acknowledge delivery to the server
      if (formattedMsg.receiverId === user.id) {
        this.socket?.emit('delivery_ack', { 
            messageId: formattedMsg.id, 
            senderId: formattedMsg.senderId 
        });
      }

      const currentMessages = this.messagesSubject.value;
      
      // Filter logic: Only append to messagesSubject if the message belongs to the current open chat
      const isFromActivePartner = formattedMsg.senderId === this.activePartnerId || formattedMsg.receiverId === this.activePartnerId;
      const isSameOpp = String(formattedMsg.opportunityId || '') === String(this.activeOpportunityId || '');

      if (isFromActivePartner && isSameOpp) {
        // Check if message is already in list (for sender)
        if (!currentMessages.some(m => m.id === formattedMsg.id)) {
          this.messagesSubject.next([...currentMessages, formattedMsg]);
        }
      }

      // Notify if it's a new message for the user (even if not from the active chat)
      if (formattedMsg.receiverId === user.id) {
          this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
          
          // Only show notification if it's NOT from the current active chat to avoid noise
          if (!(isFromActivePartner && isSameOpp)) {
            this.notificationService.addNotification(
                'New Message',
                `Real-time message from ${formattedMsg.senderId}`,
                'info'
            );
          }
      }
    });

    this.socket.on('message_delivered', (data: any) => {
      console.log('Message delivered update:', data);
      const updatedMessages = this.messagesSubject.value.map(m => {
        if (m.id === data.messageId) {
          return { ...m, isDelivered: true };
        }
        return m;
      });
      this.messagesSubject.next(updatedMessages);
    });

    this.socket.on('messages_read', (data: any) => {
      console.log('Messages marked as read by partner:', data);
      const currentMessages = this.messagesSubject.value;
      const updatedMessages = currentMessages.map(m => {
        if (m.receiverId === data.readerId && !m.isRead) {
          return { ...m, isRead: true };
        }
        return m;
      });
      this.messagesSubject.next(updatedMessages);
    });

    this.socket.on('message_update', (msg: any) => {
      console.log('Message update received via socket:', msg);
      const updatedMsg = this.formatMessage(msg);
      const currentMessages = this.messagesSubject.value.map(m => {
        if (m.id === updatedMsg.id) {
          return updatedMsg;
        }
        return m;
      });
      this.messagesSubject.next(currentMessages);
    });
    
    this.socket.on('user_status', (status: any) => {
      console.log('User status update:', status);
      this.userStatusSubject.next({
        userId: status.userId,
        isOnline: status.isOnline,
        lastActive: status.lastActive ? new Date(status.lastActive) : undefined
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }

  private getHeaders(): HttpHeaders {
    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('wastezero_token') : null;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private formatMessage(msg: any): Message {
    return {
      id: msg._id || msg.id,
      senderId: msg.sender_id || msg.senderId,
      senderName: msg.senderName || 'User',
      receiverId: msg.receiver_id || msg.receiverId,
      content: msg.content,
      messageType: msg.messageType || 'text',
      mediaUrl: msg.mediaUrl,
      timestamp: new Date(msg.timestamp),
      isAdmin: msg.isAdmin || false,
      isRead: msg.isRead || false,
      isDelivered: msg.isDelivered || false,
      isDeletedForEveryone: msg.isDeletedForEveryone || false,
      deletedFor: msg.deletedFor || [],
      opportunityId: msg.opportunityId || msg.opportunity_id
    };
  }

  deleteMessage(messageId: string, type: 'me' | 'everyone'): void {
    const user = this.authService.currentUserValue;
    if (!user || !this.socket) return;

    this.socket.emit('delete_message', { 
      messageId, 
      type, 
      userId: user.id 
    });
  }


  getChatMessages(currentUserId: string, partnerId: string, opportunityId?: string): Observable<Message[]> {
    this.activePartnerId = partnerId;
    this.activeOpportunityId = opportunityId || null;

    let url = `${this.apiUrl}/${partnerId}`;
    if (opportunityId) {
        url += `?opportunityId=${opportunityId}`;
    }
    return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
        map(msgs => msgs.map(m => this.formatMessage(m))),
        tap(msgs => this.messagesSubject.next(msgs))
    );
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (err.status === 0) {
          console.error('Connection refuse: Please ensure your backend server is running on port 5000.');
        }
        return throwError(() => err);
      })
    );
  }

  markMessagesAsRead(partnerId: string, opportunityId?: string): void {
    if (!partnerId) return;
    
    let url = `${this.apiUrl}/read/${partnerId}`;
    if (opportunityId) {
        url += `?opportunityId=${opportunityId}`;
    }

    this.http.put(url, {}, { headers: this.getHeaders() }).subscribe({
        next: () => {
            console.log(`Marked messages from ${partnerId} as read`);
            // Update local unread count
            this.updateUnreadCountFromConversations();
        },
        error: (err) => console.error('Error marking messages as read:', err)
    });
  }

  sendMessage(receiverId: string, content: string, messageType: string = 'text', mediaUrl?: string, opportunityId?: string): void {
    const body = { receiver_id: receiverId, content, messageType, mediaUrl, opportunity_id: opportunityId };
    this.http.post<any>(this.apiUrl, body, { headers: this.getHeaders() }).subscribe({
        next: (msg) => {
            const formatted = this.formatMessage(msg);
            const currentMessages = this.messagesSubject.value;
            // Prevent duplicate if socket already added it
            if (!currentMessages.some(m => m.id === formatted.id)) {
                this.messagesSubject.next([...currentMessages, formatted]);
            }
        },
        error: (err) => {
            console.error('Error sending message:', err);
        }
    });
  }
}
