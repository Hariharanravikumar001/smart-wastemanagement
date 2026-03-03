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
  role: 'User' | 'Volunteer' | 'Admin' | 'Citizen' | '' = '';
  passwordMismatch = false;

  errorMessage = '';
  termsAccepted = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    this.passwordMismatch = this.password !== this.confirmPassword;
    
    if (!this.termsAccepted) {
      this.errorMessage = 'Please accept the Terms of Service and Privacy Policy.';
      return;
    }

    if (this.name && this.username && this.email && this.password && this.role && this.location && !this.passwordMismatch) {
      this.authService.register(
        this.name, 
        this.username, 
        this.email, 
        this.role as string,
        this.location,
        this.password
      ).subscribe({
        next: (res) => {
           console.log('Registration successful', res);
           this.router.navigate(['/login']);
        },
        error: (err) => {
           console.error('Registration error', err);
           this.errorMessage = err.error?.message || 'Error occurred during registration';
        }
      });
    } else {
      this.errorMessage = 'Please fill out all required fields correctly.';
    }
  }
}
