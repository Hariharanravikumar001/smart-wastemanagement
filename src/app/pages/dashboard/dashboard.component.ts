import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable, of, map } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { Message } from '../../models/message.model';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { CitizenDashboardComponent } from './components/citizen-dashboard/citizen-dashboard.component';
import { VolunteerDashboardComponent } from './components/volunteer-dashboard/volunteer-dashboard.component';
import { MessagesComponent } from '../messages/messages.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    CitizenDashboardComponent, 
    VolunteerDashboardComponent,
    MessagesComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'overview';
  isDarkMode$ = this.themeService.isDarkMode$;
  sidebarCollapsed = false;

  // Profile Edit & Password State
  isEditMode = false;
  editUser: any = {};
  passwords = { old: '', new: '', confirm: '' };
  passwordError = '';
  passwordSuccess = '';
  profileSuccess = '';
  profileError = '';
  isSending = false;
  adminId: string | null = null;

  // Messages
  chatMessage = '';
  recentMessages$: Observable<Message[]> = of([]);

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab !== 'profile') {
      this.isEditMode = false;
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode && this.currentUser) {
      this.editUser = { ...this.currentUser };
      this.profileSuccess = '';
    }
  }

  updateProfile() {
    if (!this.currentUser) return;
    this.profileSuccess = '';
    this.profileError = '';
    this.authService.updateUserDetails(this.currentUser.email, this.editUser).subscribe({
      next: (result) => {
        this.profileSuccess = result.message;
        this.isEditMode = false;
        setTimeout(() => this.profileSuccess = '', 3000);
      },
      error: (err) => {
        this.profileError = err.error?.message || 'Failed to update profile';
        setTimeout(() => this.profileError = '', 3000);
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
    if (!this.passwords.old || !this.passwords.new) {
      this.passwordError = 'Please fill in all password fields';
      return;
    }
    this.authService.changePassword(this.currentUser.email, this.passwords.old, this.passwords.new).subscribe({
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

  sendChatMessage() {
    if (!this.chatMessage.trim() || !this.currentUser || this.isSending) return;
    
    // Use fetched adminId or fallback to a known admin if possible
    const recipientId = this.adminId;
    
    if (!recipientId) {
      console.error('No administrator found to receive the message');
      this.profileError = 'Support is currently unavailable. Please try again later.';
      return;
    }

    this.isSending = true;
    this.chatService.sendMessage(recipientId, this.chatMessage);
    this.chatMessage = '';
    // Reset sending flag after a short delay
    setTimeout(() => this.isSending = false, 500);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
      } else {
        this.currentUser = user;
        // Redirect to role-specific dashboard if accessing generic /dashboard
        if (this.router.url === '/dashboard') {
          if (user.role === 'Volunteer') {
            this.router.navigate(['/volunteer/dashboard']);
          } else if (user.role === 'Citizen' || user.role === 'User') {
            this.router.navigate(['/citizen/dashboard']);
          } else if (user.role === 'Admin' || user.role === 'NGO') {
            this.router.navigate(['/admin']);
          }
        }

        if (user.role === 'User' || user.role === 'Citizen' || user.role === 'Volunteer') {
          this.recentMessages$ = this.chatService.messages$.pipe(
            map(msgs => msgs.filter(m => m.receiverId === user.id || m.senderId === user.id).slice(-20))
          );
          
          this.fetchAdminId();
        }
      }
    });
  }

  fetchAdminId() {
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        const admin = users.find(u => u.role === 'Admin');
        if (admin) {
          this.adminId = admin.id;
        }
      },
      error: (err) => console.error('Error fetching admin for support:', err)
    });
  }
}
