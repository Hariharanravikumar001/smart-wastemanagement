import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit() {
    // Load cached user synchronously for immediate display
    const cached = this.authService.currentUserValue;
    if (cached) {
      this.currentUser = cached;
      this.editUser = { ...cached };
    }

    // Subscribe to future updates (e.g. after profile image upload)
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        if (!this.isEditMode) {
          this.editUser = { ...user };
        }
      }
    });

    // Refresh in background after subscribing
    this.authService.refreshCurrentUser();
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
      this.editUser = { 
        ...this.currentUser,
        skills: Array.isArray(this.currentUser.skills) ? [...this.currentUser.skills] : [],
        bio: this.currentUser.bio || ''
      };
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
          this.router.navigate(['/volunteer/profile']).then(() => {
            if (isPlatformBrowser(this.platformId)) {
              window.scrollTo(0, 0);
            }
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
    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you SURE you want to delete your Volunteer account? This action is permanent and all your assigned pickups and applications will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.deleteAccount().subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Your account has been successfully deleted.', 'success');
            this.router.navigate(['/login']);
          },
          error: (err) => {
            this.profileError = err.error?.message || 'Failed to delete account. Please try again later.';
            Swal.fire('Error!', this.profileError, 'error');
          }
        });
      }
    });
  }

  onSkillsChange(value: string) {
    this.editUser.skills = value.split(',').map(s => s.trim()).filter(s => s !== '');
  }
}
