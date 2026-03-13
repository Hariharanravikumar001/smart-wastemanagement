import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { OpportunityService } from '../../services/opportunity.service';
import { ApplicationService } from '../../services/application.service';
import { AdminReportService } from '../../services/admin-report.service';
import { Opportunity } from '../../models/opportunity.model';
import { Application } from '../../models/application.model';

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
  isAdmin = false;
  isVolunteer = false;
  isNGO = false;
  isDarkMode = false;
  isSidebarCollapsed = false;

  // Management Data
  allOpportunities: Opportunity[] = [];
  applications: Application[] = [];
  oppStats: any = {};
  engagementAnalytics: any = {
    totalImpact: 0,
    totalImpactChange: 0,
    responseRate: 0,
    responseRateChange: 0
  };


  // Applications view state
  viewingApplicationsFor: string | null = null;
  currentOpportunity: Opportunity | null = null;

  // Form State for Opportunities
  showOpportunityForm = false;
  editingOpportunityId: string | null = null;
  opportunityForm: any = {
    title: '',
    description: '',
    skills: '', // comma separated string
    duration: '',
    location: '',
    status: 'open'
  };

  // Profile Form
  profileForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    message: '',
    isError: false
  };

  isEditingProfile = false;
  editUser: any = {};
  profileDetailsMessage = '';
  profileDetailsIsError = false;

  stats: DashboardStats = {
    activeUsers: 0,
    activeUsersChange: 'Live data',
    totalVolunteers: 0,
    totalVolunteersChange: 'Live data',
    completedPickups: 0,
    completedPickupsChange: 'Live data',
    systemHealth: '100%',
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
    private applicationService: ApplicationService,
    private adminReportService: AdminReportService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: any) => {
      const role = user?.role?.toLowerCase();
      if (!user || (role !== 'admin' && role !== 'ngo')) {
        this.router.navigate(['/login']);
      } else {
        this.currentUser = user;
        this.isAdmin = role === 'admin';
        this.isNGO = role === 'ngo';
        this.loadAdminData();
      }
    });

    this.dashboardService.stats$.subscribe((stats: any) => {
      this.stats = { ...this.stats, ...stats };
    });


    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('admin_theme');
      this.isDarkMode = savedTheme === 'dark';
      this.applyTheme();
    }

    // Collapse sidebar by default on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      this.isSidebarCollapsed = true;
    }
  }

  private loadAdminData() {
    this.loadOpportunities();
    this.loadApplications();

    try {
      this.adminReportService.getOpportunityStats().subscribe((stats: any) => {
        this.oppStats = stats;
      });


      this.adminReportService.getEngagementAnalytics().subscribe({
        next: (analytics: any) => {
          this.engagementAnalytics = analytics;
        },
        error: (err: any) => console.error('Failed to load engagement analytics:', err)
      });

    } catch (e) {
      console.log(e);
    }

    // Update dashboard stats
    this.dashboardService.updateStats({
      activeUsers: 0,
      totalVolunteers: 0
    });
  }


  // --- Opportunities Management ---

  loadOpportunities() {
    this.opportunityService.getOpportunities().subscribe({
      next: (res) => {
        this.allOpportunities = res.opportunities || res;
      },
      error: (err: any) => console.error('Failed to load opportunities:', err)

    });
  }

  openCreateOpportunityForm() {
    this.editingOpportunityId = null;
    this.opportunityForm = { title: '', description: '', skills: '', duration: '', location: '', status: 'open' };
    this.showOpportunityForm = true;
    this.viewingApplicationsFor = null;
  }

  openEditOpportunityForm(opp: Opportunity) {
    this.editingOpportunityId = opp._id || opp.id || null;
    this.opportunityForm = {
      title: opp.title,
      description: opp.description,
      skills: opp.skills ? opp.skills.join(', ') : '',
      duration: opp.duration,
      location: opp.location,
      status: opp.status || 'open'
    };
    this.showOpportunityForm = true;
    this.viewingApplicationsFor = null;
  }

  closeOpportunityForm() {
    this.showOpportunityForm = false;
    this.editingOpportunityId = null;
  }

  saveOpportunity() {
    const data = {
      ...this.opportunityForm,
      skills: this.opportunityForm.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
    };

    if (this.editingOpportunityId) {
      this.opportunityService.updateOpportunity(this.editingOpportunityId, data).subscribe({
        next: () => {
          this.loadOpportunities();
          this.closeOpportunityForm();
        },
        error: (err: any) => alert('Error updating opportunity: ' + (err.error?.message || err.message))

      });
    } else {
      this.opportunityService.createOpportunity(data).subscribe({
        next: () => {
          this.loadOpportunities();
          this.closeOpportunityForm();
        },
        error: (err: any) => alert('Error creating opportunity: ' + (err.error?.message || err.message))

      });
    }
  }

  deleteOpportunityByAdmin(id: string | undefined) {
    if (!id) {
      console.warn('Attempted to delete opportunity with undefined ID');
      return;
    }
    
    if (confirm('Are you sure you want to PERMANENTLY delete this opportunity? This action cannot be undone.')) {
      this.opportunityService.deleteOpportunity(id).subscribe({
        next: () => {
          this.allOpportunities = this.allOpportunities.filter(opp => (opp._id || opp.id) !== id);
          // Also reload analytics as they might be affected
          this.loadAdminData();
        },
        error: (err: any) => {
          console.error('Delete opportunity error:', err);
          const errorMsg = err.error?.message || err.message || 'Unknown error';
          alert(`Error deleting opportunity: ${errorMsg}`);
        }
      });
    }
  }

  // --- Applications Management ---

  loadApplications() {
    this.applicationService.getAdminApplications().subscribe({
      next: (apps: any) => this.applications = apps,
      error: (err: any) => console.error('Failed to load applications:', err)
    });
  }

  viewApplicationsFor(oppId: string | undefined) {
    if (!oppId) return;
    this.viewingApplicationsFor = oppId;
    this.currentOpportunity = this.allOpportunities.find(o => (o._id || o.id) === oppId) || null;
    this.showOpportunityForm = false;
  }

  closeApplicationsView() {
    this.viewingApplicationsFor = null;
    this.currentOpportunity = null;
  }

  updateApplicationStatus(appId: string | undefined, status: 'accepted' | 'rejected') {
    if (!appId) return;
    this.applicationService.updateApplicationStatus(appId, status).subscribe({
      next: (updatedApp) => {
        // Update local state for immediate feedback
        const index = this.applications.findIndex(a => (a._id || a.id) === appId);
        if (index !== -1) {
          this.applications[index].status = status;
        }
        // Force list reload to be safe
        this.loadApplications();
        // Also reload opportunities to update counts if needed
        this.loadOpportunities();
      },
      error: (err: any) => {
        console.error('Update status error:', err);
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to update status: ${errorMsg}`);
      }
    });
  }

  getApplicationsForCurrentView() {
    console.log('Filtering applications for:', this.viewingApplicationsFor);
    console.log('Total applications available:', this.applications.length);
    
    const filtered = this.applications.filter((app: any) => {
      const oid = app.opportunity_id?._id || app.opportunity_id?.id || app.opportunity_id;
      const match = String(oid) === String(this.viewingApplicationsFor);
      return match;
    });

    console.log('Filtered applications:', filtered);
    return filtered;
  }

  getApplicantCount(oppId: string | undefined): number {
    if (!oppId) return 0;
    return this.applications.filter((app: any) => {
      const oid = app.opportunity_id?._id || app.opportunity_id?.id || app.opportunity_id;
      return String(oid) === String(oppId);
    }).length;
  }

  getApplicantNames(oppId: string | undefined): string {
    if (!oppId) return '';
    const apps = this.applications.filter((app: any) => {
      const oid = app.opportunity_id?._id || app.opportunity_id?.id || app.opportunity_id;
      return String(oid) === String(oppId);
    });

    if (apps.length === 0) return 'No applicants yet';
    
    return apps.map((app: any) => app.volunteer_id?.name || 'Unknown Volunteer').join(', ');
  }


  // --- Standard Admin Things ---

  downloadUserReport() {
    try { this.adminReportService.exportUsersToCSV(); } catch (e) { }
  }

  downloadOpportunityReport() {
    try { this.adminReportService.exportOpportunitiesToCSV(); } catch (e) { }
  }

  setActiveMenu(menuId: string) {
    this.activeMenu = menuId;
    if (menuId !== 'all-opportunities') {
      this.showOpportunityForm = false;
      this.viewingApplicationsFor = null;
      this.currentOpportunity = null;
    }
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

  toggleEditProfile() {
    if (!this.currentUser) return;

    this.isEditingProfile = !this.isEditingProfile;
    if (this.isEditingProfile) {
      this.editUser = { 
        ...this.currentUser,
        skills: (this.currentUser.skills || []).join(', ')
      };
      this.profileDetailsMessage = '';
    }
  }

  saveProfileDetails() {
    if (!this.currentUser) return;

    const skillsArray = this.editUser.skills
      ? this.editUser.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
      : [];

    this.authService.updateUserDetails(this.currentUser.email, {
      ...this.editUser,
      skills: skillsArray
    }).subscribe({
      next: (result) => {
        this.profileDetailsMessage = result.message;
        this.profileDetailsIsError = false;
        setTimeout(() => {
          this.isEditingProfile = false;
          this.profileDetailsMessage = '';
        }, 1500);
      },
      error: (err) => {
        this.profileDetailsMessage = err.error?.message || 'Failed to update profile';
        this.profileDetailsIsError = true;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  deleteAccount() {
    if (confirm('Are you SURE you want to delete your Admin account? This action is permanent and cannot be undone.')) {
      this.authService.deleteAccount().subscribe({
        next: () => {
          alert('Your account has been successfully deleted.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to delete account.');
        }
      });
    }
  }
}
