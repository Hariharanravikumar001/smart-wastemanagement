import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    if (this.email && this.password) {
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: (user) => {
           // On successful login, authService.currentUser$ is updated.
           // Since we tapped and mapped the token in auth.service,
           // we can check the currentUserValue.
           const authenticatedUser = this.authService.currentUserValue;
           
            if(authenticatedUser) {
              if (authenticatedUser.role === 'Admin') {
                this.router.navigate(['/admin']);
              } else if (authenticatedUser.role === 'Volunteer') {
                this.router.navigate(['/volunteer/dashboard']);
              } else if (authenticatedUser.role === 'Citizen' || authenticatedUser.role === 'User') {
                this.router.navigate(['/citizen/dashboard']);
              } else {
                this.router.navigate(['/dashboard']);
              }
            }
        },
        error: (err) => {
            console.error('Login error', err);
            this.errorMessage = err.error?.message || 'Invalid email or password';
        }
      });
    }
  }
}
