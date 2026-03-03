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
        // Hide footer on dashboard, admin, login and register routes
        const hiddenPaths = ['/register', '/login', '/dashboard', '/admin', '/opportunities', '/citizen', '/volunteer'];
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
    const isLoginPage = url.includes('/login') || url.includes('/register');
    const isAdminPage = url.includes('/admin') || (role === 'Admin');
    const isDashboard = url.includes('/dashboard');
    const isOpportunities = url.includes('/opportunities');
    this.showNavbar = !isLoginPage && !isAdminPage && !isDashboard && !isOpportunities;
  }
}
