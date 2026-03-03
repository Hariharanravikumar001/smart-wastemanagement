import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() { }

  addNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): void {
    const newNotification: Notification = {
      id: Math.random().toString(36).substring(2, 11),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([newNotification, ...current]);
    
    // Logic for toast could go here (e.g. using a global toast component)
  }

  markAsRead(id: string): void {
    const current = this.notificationsSubject.value;
    const index = current.findIndex(n => n.id === id);
    if (index !== -1) {
      current[index].read = true;
      this.notificationsSubject.next([...current]);
    }
  }

  getUnreadCount(): Observable<number> {
    return new Observable<number>(observer => {
      this.notifications$.subscribe(notifications => {
        observer.next(notifications.filter(n => !n.read).length);
      });
    });
  }
}
