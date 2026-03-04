import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  step: 1 | 2 | 3 | 4 = 1;
  
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  requestOtp() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.step = 2;
        this.successMessage = 'A 6-digit code has been sent to your email.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP. Ensure the email is registered.';
      }
    });
  }

  verifyOtp() {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: (res) => {
        this.loading = false;
        this.step = 3;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Invalid or expired OTP.';
      }
    });
  }

  resetPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.email, this.otp, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.step = 4;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password.';
      }
    });
  }
}
