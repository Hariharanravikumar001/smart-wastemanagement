import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { OpportunityService } from '../../services/opportunity.service';
import { AdminReportService } from '../../services/admin-report.service';
import { Opportunity } from '../../models/opportunity.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  currentUser: User | null = null;
  activeMenu = 'dashboard';
  isDarkMode = false;
  isSidebarCollapsed = false;

  // Management Data
  allOpportunities: Opportunity[] = [];
  oppStats: any = {};

  // Profile Form
  profileForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    message: '',
    isError: false
  };

  isEditingProfile = false;
  profileDetailsForm = {
    name: '',
    username: '',
    email: '',
    location: '',
    skills: '' as string, // Comma separated for input
    message: '',
    isError: false
  };

  stats: DashboardStats = {
    activeUsers: 0,
    activeUsersChange: '+5%',
    totalVolunteers: 0,
    totalVolunteersChange: '+12%',
    completedPickups: 245,
    completedPickupsChange: '+8%',
    systemHealth: '99.9%',
    systemHealthStatus: 'Optimal'
  };

  menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
    { id: 'all-opportunities', label: 'Opportunities', icon: 'bi-briefcase' },
    { id: 'reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
    { id: 'profile', label: 'My Profile', icon: 'bi-person-circle' }
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private dashboardService: DashboardService,
    private opportunityService: OpportunityService,
    private adminReportService: AdminReportService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (!user || user.role !== 'Admin') {
        this.router.navigate(['/login']);
      } else {
        this.currentUser = user;
        this.loadAdminData();
      }
    });

    this.dashboardService.stats$.subscribe(stats => {
      this.stats = { ...this.stats, ...stats };
    });

    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('admin_theme');
      this.isDarkMode = savedTheme === 'dark';
      this.applyTheme();
    }
  }

  private loadAdminData() {
    this.allOpportunities = this.opportunityService.getOpportunities();
    this.oppStats = this.adminReportService.getOpportunityStats();
    
    // Update dashboard stats
    this.dashboardService.updateStats({
      activeUsers: 0, // No longer fetching specific user stats
      totalVolunteers: 0
    });
  }


  deleteOpportunityByAdmin(id: string) {
    if (confirm('Are you sure you want to remove this opportunity permanently?')) {
      this.opportunityService.deleteOpportunity(id);
      this.loadAdminData();
    }
  }

  downloadUserReport() {
    this.adminReportService.exportUsersToCSV();
  }

  downloadOpportunityReport() {
    this.adminReportService.exportOpportunitiesToCSV();
  }

  setActiveMenu(menuId: string) {
    this.activeMenu = menuId;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin_theme', this.isDarkMode ? 'dark' : 'light');
    }
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document !== 'undefined') {
      if (this.isDarkMode) {
        document.body.classList.add('admin-dark-mode');
      } else {
        document.body.classList.remove('admin-dark-mode');
      }
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  updatePassword() {
    if (!this.currentUser) return;
    
    if (this.profileForm.newPassword !== this.profileForm.confirmPassword) {
      this.profileForm.message = 'New passwords do not match';
      this.profileForm.isError = true;
      return;
    }

    this.authService.changePassword(
      this.currentUser.email,
      this.profileForm.oldPassword,
      this.profileForm.newPassword
    ).subscribe({
      next: (result) => {
        this.profileForm.message = result.message;
        this.profileForm.isError = false;
        this.profileForm.oldPassword = '';
        this.profileForm.newPassword = '';
        this.profileForm.confirmPassword = '';
      },
      error: (err) => {
        this.profileForm.message = err.error?.message || 'Failed to change password';
        this.profileForm.isError = true;
      }
    });
  }

  toggleEditProfile() {
    if (!this.currentUser) return;
    
    this.isEditingProfile = !this.isEditingProfile;
    if (this.isEditingProfile) {
      this.profileDetailsForm.name = this.currentUser.name;
      this.profileDetailsForm.username = this.currentUser.username;
      this.profileDetailsForm.email = this.currentUser.email;
      this.profileDetailsForm.location = this.currentUser.location || '';
      this.profileDetailsForm.skills = (this.currentUser.skills || []).join(', ');
      this.profileDetailsForm.message = '';
    }
  }

  saveProfileDetails() {
    if (!this.currentUser) return;

    const skillsArray = this.profileDetailsForm.skills
      ? this.profileDetailsForm.skills.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    this.authService.updateUserDetails(this.currentUser.email, {
      name: this.profileDetailsForm.name,
      username: this.profileDetailsForm.username,
      email: this.profileDetailsForm.email,
      location: this.profileDetailsForm.location,
      skills: skillsArray
    }).subscribe({
      next: (result) => {
        this.profileDetailsForm.message = result.message;
        this.profileDetailsForm.isError = false;
        this.isEditingProfile = false;
      },
      error: (err) => {
        this.profileDetailsForm.message = err.error?.message || 'Failed to update profile';
        this.profileDetailsForm.isError = true;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
