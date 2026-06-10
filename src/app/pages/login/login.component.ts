import { Component, AfterViewInit, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  email = '';
  password = '';
  rememberMe = false;
  errorMessage = '';
  isLoading = false;
  isDev = false;

  constructor(
    private authService: AuthService, 
    private router: Router, 
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isDev = !environment.production && isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Check if google library is loaded
    if (typeof (window as any).google !== 'undefined') {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: environment.googleClientId, // Using environment-based configuration
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true
        });

        (window as any).google.accounts.id.renderButton(
          document.getElementById('googleBtnContainer'),
          { 
            type: 'standard',
            theme: 'outline', 
            size: 'large', 
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: '100%'
          }
        );
      } catch (err) {
        console.error('Google GSI initialization failed:', err);
      }
    } else {
        console.warn('Google GSI library not loaded yet. Retrying...');
        setTimeout(() => this.ngAfterViewInit(), 1000);
    }
  }

  handleCredentialResponse(response: any) {
    // Run inside NgZone to handle change detection from outside library
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.googleLogin(response.credential).subscribe({
        next: (res) => {
          this.isLoading = false;
          console.log('Google login successful, role:', res.role);
          this.navigateToDashboard(res.role);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Google Login status:', err.status);
          
          if (err.status === 404 && err.error?.googleData) {
            console.log('User not found, redirecting to register with Google data');
            this.router.navigate(['/register'], { 
              state: { googleData: err.error.googleData } 
            });
          } else {
            console.error('Google Login error:', err);
            const serverError = err.error?.error ? ` (${err.error.error})` : '';
            const clientIdInfo = err.error?.configuredClientIdPrefix ? ` [Server Client ID prefix: ${err.error.configuredClientIdPrefix}...]` : '';
            this.errorMessage = `Google Sign-In failed${serverError}${clientIdInfo}. Please try again.`;
          }
        }
      });
    });
  }

  useMockGoogleLogin(role: string) {
    this.handleCredentialResponse({ credential: 'mock_google_token_' + role });
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.email && this.password && !this.isLoading) {
      this.isLoading = true;
      this.authService.login({ email: this.email, password: this.password }, this.rememberMe).subscribe({
        next: (response) => {
           this.isLoading = false;
           console.log('Login successful, navigating based on role:', response.role);
           this.navigateToDashboard(response.role);
        },
        error: (err) => {
            this.isLoading = false;
            console.error('Login error detailed:', err);
            this.errorMessage = err.error?.message || err.message || 'Invalid email or password. Please try again.';
        }
      });
    }
  }

  private navigateToDashboard(role: string) {
    if (!role) {
      this.router.navigate(['/dashboard']);
      return;
    }
    
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'admin' || lowerRole === 'ngo') {
      this.router.navigate(['/admin']);
    } else if (lowerRole === 'volunteer') {
      this.router.navigate(['/volunteer/dashboard']);
    } else if (lowerRole === 'citizen' || lowerRole === 'user') {
      this.router.navigate(['/citizen/dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
