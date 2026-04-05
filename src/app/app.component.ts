import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'smartwaste';
  showFooter = true;
  showNavbar = true;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Hide footer on dashboard, admin, login, register and messaging routes
        const hiddenPaths = ['/register', '/login', '/dashboard', '/admin', '/opportunities', '/citizen', '/volunteer', '/forgot-password', '/messages', '/chat'];
        this.showFooter = !hiddenPaths.some(path => event.urlAfterRedirects.includes(path));
        this.checkNavbarVisibility(event.urlAfterRedirects);
      }
    });

    this.authService.currentUser$.subscribe(() => {
      this.checkNavbarVisibility(this.router.url);
    });
  }

  private checkNavbarVisibility(url: string) {
    const role = this.authService.currentUserValue?.role;
    const isLoginPage = url.includes('/login') || url.includes('/register') || url.includes('/forgot-password');
    const isAdminPage = url.includes('/admin') || (role === 'Admin');
    const isDashboard = url.includes('/dashboard') || url.includes('/citizen') || url.includes('/volunteer');
    const isOpportunities = url.includes('/opportunities');
    const isMessaging = url.includes('/messages') || url.includes('/chat');
    this.showNavbar = !isLoginPage && !isAdminPage && !isDashboard && !isOpportunities && !isMessaging;
  }
}
