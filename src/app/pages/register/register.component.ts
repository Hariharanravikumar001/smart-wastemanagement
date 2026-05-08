import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  name = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  location = '';
  contactNumber = '';
  role: 'User' | 'Volunteer' | 'Admin' | 'Citizen' | 'NGO' | '' = '';
  passwordMismatch = false;

  showOtpField = false;
  otp = '';
  otpVerified = false;
  generatedOtp = '';

  errorMessage = '';
  termsAccepted = false;

  constructor(private authService: AuthService, private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { googleData: any };
    
    if (state && state.googleData) {
      console.log('Pre-filling registration form with Google data:', state.googleData);
      this.name = state.googleData.name || '';
      this.email = state.googleData.email || '';
      this.errorMessage = 'Please complete your profile to finish signing up with Google';
    }
  }

  sendOtp() {
    if (!this.contactNumber) return;
    // Generate random 6-digit OTP
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`[Demo] OTP "${this.generatedOtp}" sent to ${this.contactNumber}`);
    this.showOtpField = true;
  }

  verifyOtp() {
    if (this.otp === this.generatedOtp) {
      this.otpVerified = true;
      alert('OTP Verified!');
    } else {
      alert('Invalid OTP. Please check the alert for the correct code.');
    }
  }

  onSubmit() {
    this.errorMessage = '';
    this.passwordMismatch = this.password !== this.confirmPassword;
    
    if (!this.termsAccepted) {
      this.errorMessage = 'Please accept the Terms of Service and Privacy Policy.';
      return;
    }

    if (!this.otpVerified && this.contactNumber) {
      this.errorMessage = 'Please verify your contact number with OTP.';
      return;
    }

    if (this.name && this.username && this.email && this.password && this.role && this.location && !this.passwordMismatch) {
      this.authService.register(
        this.name, 
        this.username, 
        this.email, 
        this.role as string,
        this.location,
        this.password,
        this.contactNumber
      ).subscribe({
        next: (res) => {
           console.log('Registration successful', res);
           this.router.navigate(['/login']);
        },
        error: (err) => {
           console.error('Registration error', err);
           this.errorMessage = err.error?.message || err.message || 'Error occurred during registration';
        }
      });
    } else {
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
