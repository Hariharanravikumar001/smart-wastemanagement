import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { ChatService } from '../../../services/chat.service';

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

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (!user || user.role !== 'Citizen') {
        this.router.navigate(['/login']);
      } else {
        this.currentUser = user;
      }
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
