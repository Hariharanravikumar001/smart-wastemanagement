import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'error';
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket: Socket | null = null;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private apiUrl = '/api/notifications';

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private http: HttpClient, 
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        if (!this.socket) {
          this.initSocket();
        }
        this.loadNotifications();
      } else {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        this.notificationsSubject.next([]);
      }
    });
  }

  private initSocket(): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.socket = io({ path: '/socket.io' });
    this.socket.on('connect', () => {
      this.socket?.emit('join', user.id);
    });

    this.socket.on('new_notification', (notif: any) => {
      const formatted = this.formatNotif(notif);
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([formatted, ...current]);
    });
  }

  private loadNotifications(): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (notifs) => {
        const formatted = notifs.map(n => this.formatNotif(n));
        this.notificationsSubject.next(formatted);
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  private getHeaders(): HttpHeaders {
    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('wastezero_token') : null;
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  private formatNotif(n: any): Notification {
    return {
      id: n._id || n.id,
      title: n.title,
      message: n.message,
      type: n.type === 'error' ? 'danger' : n.type,
      timestamp: new Date(n.timestamp),
      read: n.is_read || false
    };
  }

  addNotification(title: string, message: string, type: any = 'info'): void {
    // This is now handled by the backend, but we keep the method signature if local alerts are needed
    const newNotif: Notification = {
      id: 'local-' + Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([newNotif, ...current]);
  }

  markAsRead(id: string): void {
    if (id.startsWith('local-')) {
        const current = this.notificationsSubject.value;
        const index = current.findIndex(n => n.id === id);
        if (index !== -1) {
            current[index].read = true;
            this.notificationsSubject.next([...current]);
        }
        return;
    }

    this.http.put(`${this.apiUrl}/${id}/read`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => {
        const current = this.notificationsSubject.value;
        const index = current.findIndex(n => n.id === id);
        if (index !== -1) {
            current[index].read = true;
            this.notificationsSubject.next([...current]);
        }
      }
    });
  }

  getUnreadCount(): Observable<number> {
    return this.notifications$.pipe(
        map(notifs => notifs.filter(n => !n.read).length)
    );
  }
}
