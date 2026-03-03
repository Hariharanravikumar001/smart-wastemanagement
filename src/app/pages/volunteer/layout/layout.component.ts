import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

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

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (!user || user.role !== 'Volunteer') {
        this.router.navigate(['/login']);
      } else {
        this.currentUser = user;
      }
    });
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
