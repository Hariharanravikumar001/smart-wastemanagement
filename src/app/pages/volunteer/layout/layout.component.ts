import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { ThemeService } from '../../../services/theme.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-volunteer-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class VolunteerLayoutComponent implements OnInit {
  currentUser: User | null = null;
  sidebarCollapsed = false;
  isDarkMode$ = this.themeService.isDarkMode$;
  unreadCount$ = this.chatService.unreadCount$;
  unreadNotifications$ = this.notificationService.getUnreadCount();
  notifications$ = this.notificationService.notifications$;
  showNotifDrawer = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private themeService: ThemeService,
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
        // Allow volunteer, but also allow admin/ngo if they are accessing this dashboard for management/testing
        const isAllowed = role === 'volunteer' || role === 'admin' || role === 'ngo';
        
        if (!isAllowed) {
          console.warn('⚠️ [DB_SECURITY] Unauthorized role access to volunteer dashboard:', role);
          // Only redirect if it's explicitly a citizen trying to access volunteer dashboard
          if (role === 'citizen' || role === 'user') {
            this.router.navigate(['/login']);
          }
        } else {
          this.currentUser = user;
        }
      }
      // If user is null (transient from refreshCurrentUser), we skip the check to avoid flickering/redirects
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
