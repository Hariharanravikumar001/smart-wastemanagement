import { Component, OnInit, AfterViewInit, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable, Subscription, timer } from 'rxjs';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { OpportunityService } from '../../services/opportunity.service';
import { ApplicationService } from '../../services/application.service';
import { AdminReportService } from '../../services/admin-report.service';
import { ChatService } from '../../services/chat.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Opportunity } from '../../models/opportunity.model';
import { Application } from '../../models/application.model';
import { EngagementAnalytics, OpportunityForm, OppStats, ProfileForm } from '../../models/admin-interfaces.model';
import Swal from 'sweetalert2';
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

  // Notifications
  unreadNotifications$: Observable<number>;
  notifications$: Observable<Notification[]>;
  showNotifDrawer = false;

  // Management Data
  allOpportunities: Opportunity[] = [];
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  applications: Application[] = [];
  oppStats: OppStats = {};
  engagementAnalytics: EngagementAnalytics = {
    totalImpact: 0,
    totalImpactChange: 0,
    responseRate: 0,
    responseRateChange: 0
  };

  // Search
  globalSearchTerm: string = '';
  filteredOpportunities: Opportunity[] = [];

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
  isSubmittingOpportunity = false;
  opportunityForm: OpportunityForm = {
    title: '',
    description: '',
    skills: '', // comma separated string
    duration: '',
    location: '',
    wasteType: '',
    status: 'open'
  };

  // Messaging State
  conversations: any[] = [];
  activeChatMessages: any[] = [];
  selectedPartner: any = null;
  newMessageContent = '';
  isChatLoading = false;

  // Profile Form
  profileForm: ProfileForm = {
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
    { id: 'users', label: 'User Management', icon: 'bi-people' },
    { id: 'messages', label: 'Messages', icon: 'bi-chat-dots' },
    { id: 'reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
    { id: 'profile', label: 'My Profile', icon: 'bi-person-circle' }
  ];
  private pollingSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private opportunityService: OpportunityService,
    private applicationService: ApplicationService,
    private adminReportService: AdminReportService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.unreadNotifications$ = this.notificationService.getUnreadCount();
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit() {
    // Check if there's a cached user first — avoid redirect on initial load
    const cachedUser = this.authService.currentUserValue;
    if (this.isBrowser && !cachedUser) {
      this.router.navigate(['/login']);
      return;
    }

    let pollingStarted = false;

    this.authService.currentUser$.subscribe((user: any) => {
      const role = user?.role?.toLowerCase();

      if (user && (role === 'admin' || role === 'ngo')) {
        this.currentUser = user;
        this.isAdmin = role === 'admin';
        this.isNGO = role === 'ngo';
        this.loadAdminData();

        // Start background polling only once
        if (this.isBrowser && !pollingStarted) {
          pollingStarted = true;
          this.pollingSub = timer(60000, 60000).subscribe(() => this.loadAdminData());
        }
      } else if (this.isBrowser && user && role !== 'admin' && role !== 'ngo') {
        // User is logged in but not an admin — redirect
        this.router.navigate(['/login']);
      }
      // If user is null (e.g. refresh failed), keep current UI until explicit logout
    });

    // Refresh user data in background after subscribing
    this.authService.refreshCurrentUser();

    this.dashboardService.stats$.subscribe((stats: any) => {
      this.stats = { ...this.stats, ...stats };
    });


    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('admin_theme');
      this.isDarkMode = savedTheme === 'dark';
      this.applyTheme();
    }

    // Collapse sidebar by default on mobile
    if (this.isBrowser && window.innerWidth < 992) {
      this.isSidebarCollapsed = true;
    }

    // Subscribe to real-time messages
    this.chatService.messages$.subscribe(msgs => {
      if (this.selectedPartner) {
        this.activeChatMessages = msgs;
        this.scrollToBottom();
      }
    });
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        this.initCharts();
      });
    }
  }

  private initCharts() {
    if (!this.isBrowser) return;

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
        const labels = this.engagementAnalytics.trends?.labels || [];
        const data = this.engagementAnalytics.trends?.data || [];
        
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
        const labels = Object.keys(this.oppStats.byType || {});
        const data = Object.values(this.oppStats.byType || {}) as number[];
        this.opsByTypeChart.data.labels = labels;
        this.opsByTypeChart.data.datasets[0].data = data;
        this.opsByTypeChart.update();
      });
    }
  }

  selectedRange = '1week';

  loadReports() {
    this.adminReportService.getUserStats().subscribe({
      next: (stats: any) => {
        this.stats = {
          ...this.stats,
          activeUsers: stats.total,
          totalVolunteers: stats.volunteers
        };
      },
      error: (err) => console.error('Error loading user stats:', err)
    });
  }

  private loadAdminData() {
    this.loadOpportunities();
    this.loadUsers();
    this.loadApplications();
    this.loadReports();

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
      next: (res: any) => {
        // Handle both array and paginated object structure
        this.allOpportunities = res.opportunities || (Array.isArray(res) ? res : []);
        this.filterOpportunities();
      },
      error: (err: any) => console.error('Failed to load opportunities:', err)
    });
  }

  filterOpportunities() {
    if (!this.globalSearchTerm.trim()) {
      this.filteredOpportunities = [...this.allOpportunities];
      return;
    }
    const term = this.globalSearchTerm.toLowerCase();
    this.filteredOpportunities = this.allOpportunities.filter(opp => 
      opp.title.toLowerCase().includes(term) || 
      opp.location.toLowerCase().includes(term) ||
      (opp.status && opp.status.toLowerCase().includes(term))
    );
    this.filterUsers();
  }

  openCreateOpportunityForm() {
    this.editingOpportunityId = null;
    this.opportunityForm = { title: '', description: '', skills: '', duration: '', location: '', wasteType: '', status: 'open' };
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
      wasteType: (opp as any).wasteType || '',
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
    if (this.isSubmittingOpportunity) return;

    const data = {
      ...this.opportunityForm,
      skills: this.opportunityForm.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
    };

    this.isSubmittingOpportunity = true;

    if (this.editingOpportunityId) {
      this.opportunityService.updateOpportunity(this.editingOpportunityId, data).subscribe({
        next: () => {
          this.loadOpportunities();
          this.closeOpportunityForm();
          this.isSubmittingOpportunity = false;
        },
        error: (err: any) => {
          alert('Error updating opportunity: ' + (err.error?.message || err.message));
          this.isSubmittingOpportunity = false;
        }
      });
    } else {
      this.opportunityService.createOpportunity(data).subscribe({
        next: () => {
          this.loadOpportunities();
          this.closeOpportunityForm();
          this.isSubmittingOpportunity = false;
        },
        error: (err: any) => {
          alert('Error creating opportunity: ' + (err.error?.message || err.message));
          this.isSubmittingOpportunity = false;
        }
      });
    }
  }

  deleteOpportunityByAdmin(id: string | undefined) {
    if (!id) {
      console.warn('Attempted to delete opportunity with undefined ID');
      return;
    }
    
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this opportunity!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.opportunityService.deleteOpportunity(id).subscribe({
          next: () => {
            this.allOpportunities = this.allOpportunities.filter(opp => (opp._id || opp.id) !== id);
            this.filterOpportunities();
            this.loadAdminData();
            Swal.fire('Deleted!', 'The opportunity has been deleted.', 'success');
          },
          error: (err: any) => {
            console.error('Delete opportunity error:', err);
            const errorMsg = err.error?.message || err.message || 'Unknown error';
            Swal.fire('Error', `Error deleting opportunity: ${errorMsg}`, 'error');
          }
        });
      }
    });

  }

  // --- User Management ---

  loadUsers() {
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filterUsers();
      },
      error: (err) => console.error('Failed to load users:', err)
    });
  }

  filterUsers() {
    if (!this.globalSearchTerm.trim()) {
      this.filteredUsers = [...this.allUsers];
      return;
    }
    const term = this.globalSearchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.isSuspended;
    this.authService.setUserStatus(user.id, newStatus).subscribe({
      next: () => {
        user.isSuspended = newStatus;
        // Success notification is handled by backend logs, but we update local UI
      },
      error: (err) => {
        console.error('Failed to update user status:', err);
        alert('Failed to update user status: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- Applications Management ---

  loadApplications() {
    this.applicationService.getAdminApplications().subscribe({
      next: (apps: any) => {
        // Handle both array and paginated object structure
        this.applications = apps.applications || (Array.isArray(apps) ? apps : []);
      },
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
    const filtered = this.applications.filter((app: any) => {
      const oid = app.opportunity_id?._id || app.opportunity_id?.id || app.opportunity_id;
      const match = String(oid) === String(this.viewingApplicationsFor);
      return match;
    });

    return filtered;
  }

  getApplicantCount(oppId: string | undefined): number {
    return 0; // Handled by backend for list view
  }

  getApplicantNames(oppId: string | undefined): string {
    return ''; // Handled by backend for list view
  }


  // --- Standard Admin Things ---

  downloadUserReport() {
    try { 
      this.adminReportService.exportUsersToCSV(); 
    } catch (e) {
      console.error('Error in downloadUserReport:', e);
    }
  }

  downloadOpportunityReport() {
    try { 
      this.adminReportService.exportOpportunitiesToCSV(); 
    } catch (e) {
      console.error('Error in downloadOpportunityReport:', e);
    }
  }

  setActiveMenu(menuId: string) {
    this.activeMenu = menuId;
    if (menuId !== 'all-opportunities' && menuId !== 'users') {
      this.showOpportunityForm = false;
      this.viewingApplicationsFor = null;
      this.currentOpportunity = null;
    }

    if (menuId === 'messages') {
      this.loadConversations();
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
    if (this.isBrowser) {
      localStorage.setItem('admin_theme', this.isDarkMode ? 'dark' : 'light');
    }
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isBrowser) {
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
      this.profileForm.oldPassword || '',
      this.profileForm.newPassword || ''
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
      this.editUser = { 
        ...this.currentUser,
        skills: Array.isArray(this.currentUser.skills) ? this.currentUser.skills.join(', ') : (this.currentUser.skills || ''),
        bio: this.currentUser.bio || ''
      };
      this.profileDetailsMessage = '';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.authService.uploadProfileImage(file).subscribe({
        next: (response) => {
          this.profileDetailsMessage = 'Profile image updated successfully';
          this.profileDetailsIsError = false;
          setTimeout(() => this.profileDetailsMessage = '', 3000);
        },
        error: (err) => {
          this.profileDetailsMessage = err.error?.message || 'Failed to upload image';
          this.profileDetailsIsError = true;
        }
      });
    }
  }

  saveProfileDetails() {
    if (!this.currentUser) return;

    let skillsArray = [];
    if (this.editUser.skills) {
      if (Array.isArray(this.editUser.skills)) {
        skillsArray = this.editUser.skills;
      } else {
        skillsArray = this.editUser.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
      }
    }

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

  // --- Messaging Logic ---

  loadConversations() {
    this.chatService.getConversations().subscribe({
      next: (convs) => {
        this.conversations = convs;
      },
      error: (err) => console.error('Error loading conversations:', err)
    });
  }

  selectConversation(partner: any) {
    this.selectedPartner = partner;
    this.isChatLoading = true;
    this.chatService.getChatMessages(this.currentUser?.id || '', partner.partnerId, partner.opportunityId).subscribe({
      next: (msgs) => {
        this.activeChatMessages = msgs;
        this.isChatLoading = false;
        this.scrollToBottom();
        this.chatService.markMessagesAsRead(partner.partnerId, partner.opportunityId);
      },
      error: (err) => {
        console.error('Error loading chat:', err);
        this.isChatLoading = false;
      }
    });
  }

  sendAdminMessage() {
    if (!this.newMessageContent.trim() || !this.selectedPartner) return;
    
    this.chatService.sendMessage(
      this.selectedPartner.partnerId, 
      this.newMessageContent, 
      'text', 
      undefined, 
      this.selectedPartner.opportunityId
    );
    this.newMessageContent = '';
    this.scrollToBottom();
  }

  private scrollToBottom() {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const container = document.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  logout() {
    if (this.pollingSub) this.pollingSub.unsubscribe();
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

  toggleNotifDrawer() {
    this.showNotifDrawer = !this.showNotifDrawer;
  }

  markNotifAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  downloadApplicationReport() {
    try {
      this.adminReportService.exportApplicationsToCSV();
    } catch (err) {
      console.error('Application report export failed:', err);
      alert('Failed to generate Application report. Please try again.');
    }
  }
}

