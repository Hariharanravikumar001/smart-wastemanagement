import { Component, OnInit, AfterViewInit, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, AfterViewInit {
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

  // Charts
  private engagementChart: any;
  private reportsEngagementChart: any;
  private opsByTypeChart: any;
  private isBrowser: boolean;


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
    private adminReportService: AdminReportService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

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

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        this.initCharts();
      });
    }
  }

  private initCharts() {
    // Engagement Chart (Dashboard)
    const ctxEng = document.getElementById('engagementChart') as HTMLCanvasElement;
    if (ctxEng) {
      if (this.engagementChart) {
        this.engagementChart.destroy();
      }
      this.engagementChart = new Chart(ctxEng, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Engagement',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#10b981',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { 
            y: { 
              beginAtZero: true, 
              grid: { display: false },
              ticks: { precision: 0, stepSize: 1 }
            }, 
            x: { grid: { display: false } } 
          }
        }
      });
    }

    // Engagement Line Chart (Reports)
    const ctxReportsEng = document.getElementById('reportsEngagementChart') as HTMLCanvasElement;
    if (ctxReportsEng) {
      if (this.reportsEngagementChart) {
        this.reportsEngagementChart.destroy();
      }
      this.reportsEngagementChart = new Chart(ctxReportsEng, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Engagement',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#3b82f6',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { 
            y: { 
              beginAtZero: true, 
              grid: { display: false },
              ticks: { precision: 0, stepSize: 1 }
            }, 
            x: { grid: { display: false } } 
          }
        }
      });
    }

    // Ops by Type Chart
    const ctxOps = document.getElementById('opsByTypeChart') as HTMLCanvasElement;
    if (ctxOps) {
      if (this.opsByTypeChart) {
        this.opsByTypeChart.destroy();
      }
      this.opsByTypeChart = new Chart(ctxOps, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6 } } },
          cutout: '70%'
        }
      });
    }
  }

  private updateCharts() {
    if (!this.isBrowser) return;

    if (this.engagementChart && this.engagementAnalytics.trends) {
      this.ngZone.runOutsideAngular(() => {
        const labels = this.engagementAnalytics.trends.labels;
        const data = this.engagementAnalytics.trends.data;
        
        this.engagementChart.data.labels = labels;
        this.engagementChart.data.datasets[0].data = data;
        this.engagementChart.data.datasets[0].label = 'Pickup Requests';
        this.engagementChart.update();

        if (this.reportsEngagementChart) {
          this.reportsEngagementChart.data.labels = labels;
          this.reportsEngagementChart.data.datasets[0].data = data;
          this.reportsEngagementChart.data.datasets[0].label = 'Pickup Requests';
          this.reportsEngagementChart.update();
        }
      });
    }

    if (this.opsByTypeChart && this.oppStats.byType) {
      this.ngZone.runOutsideAngular(() => {
        const labels = Object.keys(this.oppStats.byType);
        const data = Object.values(this.oppStats.byType);
        this.opsByTypeChart.data.labels = labels;
        this.opsByTypeChart.data.datasets[0].data = data;
        this.opsByTypeChart.update();
      });
    }
  }

  selectedRange = '1week';

  private loadAdminData() {
    this.loadOpportunities();
    this.loadApplications();

    try {
      this.adminReportService.getOpportunityStats().subscribe((stats: any) => {
        this.oppStats = stats;
        this.updateCharts();
      });


      this.updateAnalytics();

    } catch (e) {
      console.log(e);
    }

    // Dashboard stats are now updated from analytics data in the updateAnalytics subscription
  }

  updateAnalytics(range: string = this.selectedRange) {
      this.selectedRange = range;
      this.adminReportService.getEngagementAnalytics(range).subscribe({
        next: (analytics: any) => {
          this.engagementAnalytics = analytics;
          
          // Update real-time stats cards with data from analytics
          this.dashboardService.updateStats({
            activeUsers: analytics.activeUsers || 0,
            activeUsersChange: analytics.activeUsersChange !== undefined ? `${analytics.activeUsersChange >= 0 ? '+' : ''}${analytics.activeUsersChange}% monthly` : 'Live data',
            totalVolunteers: analytics.totalVolunteers || 0,
            totalVolunteersChange: analytics.totalVolunteersChange !== undefined ? `${analytics.totalVolunteersChange >= 0 ? '+' : ''}${analytics.totalVolunteersChange}% monthly` : 'Live data',
            completedPickups: analytics.completedPickups || 0
          });

          this.updateCharts();
        },
        error: (err: any) => console.error('Failed to load engagement analytics:', err)
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

    if (this.isBrowser && (menuId === 'dashboard' || menuId === 'reports')) {
      setTimeout(() => {
        this.ngZone.runOutsideAngular(() => {
          this.initCharts();
          this.updateCharts();
        });
      }, 0);
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
