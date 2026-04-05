import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { ChatService } from '../../../services/chat.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-citizen-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class CitizenLayoutComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  isDarkMode$ = this.themeService.isDarkMode$;
  unreadCount$ = this.chatService.unreadCount$;
  unreadNotifications$ = this.notificationService.getUnreadCount();
  notifications$ = this.notificationService.notifications$;
  showNotifDrawer = false;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (!isBrowser) return;

    // Check cached user synchronously to avoid redirect on first load
    const cachedUser = this.authService.currentUserValue;
    if (!cachedUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.currentUser$.subscribe(user => {
      if (!isBrowser) return;

      if (user) {
        const role = user.role.toLowerCase();
        const isAllowed = role === 'citizen' || role === 'user';

        if (!isAllowed) {
          console.warn('Unauthorized role access to citizen dashboard:', role);
          this.router.navigate(['/login']);
        } else {
          this.currentUser = user;
        }
      }
      // If user is null (transient from refreshCurrentUser), keep current UI
    });

    if (typeof window !== 'undefined' && window.innerWidth < 769) {
      this.sidebarCollapsed = true;
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleNotifDrawer() {
    this.showNotifDrawer = !this.showNotifDrawer;
  }

  markNotifAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
