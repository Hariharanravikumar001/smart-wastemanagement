import { Component } from '@angular/core';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  currentUser: User | null = null;

  constructor(private authService: AuthService, private router: Router) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  getDashboardLink(): string {
    if (!this.currentUser) return '/';
    if (this.currentUser.role === 'Admin') return '/admin';
    if (this.currentUser.role === 'Volunteer') return '/volunteer/dashboard';
    if (this.currentUser.role === 'Citizen' || this.currentUser.role === 'User') return '/citizen/dashboard';
    return '/dashboard';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
