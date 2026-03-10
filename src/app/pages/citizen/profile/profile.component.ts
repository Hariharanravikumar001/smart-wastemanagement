import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  
  // Profile Edit State
  isEditMode = false;
  editUser: any = {};
  profileSuccess = '';
  profileError = '';

  // Password Change State
  passwords = { old: '', new: '', confirm: '' };
  passwordSuccess = '';
  passwordError = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.editUser = { ...user };
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editUser.profileImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode && this.currentUser) {
      this.editUser = { ...this.currentUser };
      this.profileSuccess = '';
      this.profileError = '';
    }
  }

  updateProfile() {
    if (!this.currentUser) return;
    this.authService.updateUserDetails(this.currentUser.email, this.editUser).subscribe({
      next: (result) => {
        this.profileSuccess = result.message;
        this.isEditMode = false;
        
        // Navigate to dashboard or refresh the profile view
        setTimeout(() => {
          this.profileSuccess = '';
          this.router.navigate(['/citizen/profile']).then(() => {
            window.scrollTo(0, 0);
          });
        }, 1500); // Short delay so they see the success message
      },
      error: (err) => {
        this.profileError = err.error?.message || 'Failed to update profile';
      }
    });
  }

  updatePassword() {
    if (!this.currentUser) return;
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.passwords.new !== this.passwords.confirm) {
      this.passwordError = 'New passwords do not match';
      return;
    }

    this.authService.changePassword(
      this.currentUser.email, 
      this.passwords.old, 
      this.passwords.new
    ).subscribe({
      next: (result) => {
        this.passwordSuccess = result.message;
        this.passwords = { old: '', new: '', confirm: '' };
        setTimeout(() => this.passwordSuccess = '', 3000);
      },
      error: (err) => {
        this.passwordError = err.error?.message || 'Failed to change password';
      }
    });
  }

  deleteAccount() {
    if (confirm('Are you SURE you want to delete your account? This action is permanent and all your data (pickup requests, messages) will be removed forever.')) {
      this.authService.deleteAccount().subscribe({
        next: () => {
          alert('Your account has been successfully deleted.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.profileError = err.error?.message || 'Failed to delete account. Please try again later.';
        }
      });
    }
  }
}
