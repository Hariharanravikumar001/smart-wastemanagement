import { Component, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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

import { ChatComponent } from '../chat/chat.component';

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChatComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
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
  selectedUserRole: string = '';
  filteredOpportunities: Opportunity[] = [];

  // Feedbacks
  feedbacks: any[] = [];

  // Charts
  private engagementChart: any;
  private reportsEngagementChart: any;
  private opsByTypeChart: any;
  private locationDistributionChart: any;
  private wasteCategoriesChart: any;
  private monthlyCollectionsChart: any;
  private recyclingRateChart: any;
  private userGrowthChart: any;
  private pickupSuccessRateChart: any;
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
    skills: '',
    duration: '',
    location: '',
    wasteType: [],
    status: 'open',
    startDate: '',
    startTime: '',
    scheduleType: 'none',
    scheduleDays: [],
    scheduleTime: ''
  };

  wasteTypeOptions = [
    { value: 'Plastic', icon: '🧴' },
    { value: 'Paper', icon: '📄' },
    { value: 'Metal', icon: '🔩' },
    { value: 'E-Waste', icon: '💻' },
    { value: 'Organic', icon: '🌿' },
    { value: 'Glass', icon: '🥃' },
    { value: 'Hazardous', icon: '☢️' },
    { value: 'Other', icon: '📦' }
  ];

  weekDays = [
    { value: 'Monday', short: 'Mon' },
    { value: 'Tuesday', short: 'Tue' },
    { value: 'Wednesday', short: 'Wed' },
    { value: 'Thursday', short: 'Thu' },
    { value: 'Friday', short: 'Fri' },
    { value: 'Saturday', short: 'Sat' },
    { value: 'Sunday', short: 'Sun' }
  ];

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
    { id: 'reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
    { id: 'messages', label: 'Messages', icon: 'bi-chat-dots' },
    { id: 'feedback', label: 'AI Sentiment', icon: 'bi-robot' },
    { id: 'profile', label: 'My Profile', icon: 'bi-person-circle' }
  ];
  private pollingSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private opportunityService: OpportunityService,
    private applicationService: ApplicationService,
    private adminReportService: AdminReportService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.unreadNotifications$ = this.notificationService.getUnreadCount();
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') || 'dashboard';
      this.selectMenu(tab);
    });

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
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
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

    // Destroy existing charts to prevent canvas reuse errors
    if (this.reportsEngagementChart) {
      this.reportsEngagementChart.destroy();
      this.reportsEngagementChart = null;
    }
    if (this.locationDistributionChart) {
      this.locationDistributionChart.destroy();
      this.locationDistributionChart = null;
    }
    if (this.wasteCategoriesChart) {
      this.wasteCategoriesChart.destroy();
      this.wasteCategoriesChart = null;
    }
    if (this.monthlyCollectionsChart) {
      this.monthlyCollectionsChart.destroy();
      this.monthlyCollectionsChart = null;
    }
    if (this.recyclingRateChart) {
      this.recyclingRateChart.destroy();
      this.recyclingRateChart = null;
    }
    if (this.userGrowthChart) {
      this.userGrowthChart.destroy();
      this.userGrowthChart = null;
    }
    if (this.pickupSuccessRateChart) {
      this.pickupSuccessRateChart.destroy();
      this.pickupSuccessRateChart = null;
    }    const reportsCanvas = document.getElementById('reportsEngagementChart') as HTMLCanvasElement;
    if (reportsCanvas) {
      const ctx = reportsCanvas.getContext('2d');
      if (ctx) {
        const labels = this.engagementAnalytics?.trends?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = this.engagementAnalytics?.trends?.data || [0, 0, 0, 0, 0, 0, 0];
        
        // Premium gradient area fill below the line
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

        this.reportsEngagementChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Completed Pickups',
              data: data,
              borderColor: '#10b981',
              backgroundColor: gradient,
              borderWidth: 3,
              fill: true,
              tension: 0.45,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#10b981',
              pointBorderWidth: 2.5,
              pointRadius: 4.5,
              pointHoverRadius: 7,
              pointHoverBackgroundColor: '#10b981',
              pointHoverBorderColor: '#ffffff',
              pointHoverBorderWidth: 2.5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.03)' },
                ticks: { stepSize: 1 }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        });
      }
    }

    const locationCanvas = document.getElementById('locationDistributionChart') as HTMLCanvasElement;
    if (locationCanvas) {
      const ctx = locationCanvas.getContext('2d');
      if (ctx) {
        const locations = this.engagementAnalytics?.locationDistribution?.labels || ['Gachibowli', 'Madhapur', 'Miyapur', 'Hyderabad', 'Secunderabad'];
        const values = this.engagementAnalytics?.locationDistribution?.data || [45, 60, 30, 95, 55];
        this.locationDistributionChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: locations,
            datasets: [{
              data: values,
              backgroundColor: ['#10b981', '#3b82f6', '#fbbf24', '#a78bfa', '#f43f5e'],
              borderWidth: 1,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  boxWidth: 10,
                  font: { size: 9 }
                }
              }
            }
          }
        });
      }
    }

    const wasteCanvas = document.getElementById('wasteCategoriesChart') as HTMLCanvasElement;
    if (wasteCanvas) {
      const ctx = wasteCanvas.getContext('2d');
      if (ctx) {
        const categories = this.engagementAnalytics?.wasteCategories?.labels || ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Paper'];
        const values = this.engagementAnalytics?.wasteCategories?.data || [120, 185, 45, 60, 95];
        
        // Premium horizontal gradient for horizontal bars
        const barGradient = ctx.createLinearGradient(0, 0, 300, 0);
        barGradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
        barGradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');

        this.wasteCategoriesChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: categories,
            datasets: [{
              label: 'Total Diverted (kg)',
              data: values,
              backgroundColor: barGradient,
              borderColor: '#3b82f6',
              borderWidth: 1.5,
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.03)' }
              },
              y: {
                grid: { display: false }
              }
            }
          }
        });
      }
    }

    const monthlyCanvas = document.getElementById('monthlyCollectionsChart') as HTMLCanvasElement;
    if (monthlyCanvas) {
      const ctx = monthlyCanvas.getContext('2d');
      if (ctx) {
        const labels = this.engagementAnalytics?.monthlyCollections?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = this.engagementAnalytics?.monthlyCollections?.data || [0, 0, 0, 0, 0, 0];
        this.monthlyCollectionsChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Monthly Collections',
              data: data,
              backgroundColor: '#3b82f6',
              borderRadius: 6
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }

    const recyclingCanvas = document.getElementById('recyclingRateChart') as HTMLCanvasElement;
    if (recyclingCanvas) {
      const ctx = recyclingCanvas.getContext('2d');
      if (ctx) {
        const labels = this.engagementAnalytics?.recyclingRate?.labels || ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Paper', 'Other'];
        const data = this.engagementAnalytics?.recyclingRate?.data || [0, 0, 0, 0, 0, 0];
        this.recyclingRateChart = new Chart(ctx, {
          type: 'polarArea',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(251, 191, 36, 0.7)', 'rgba(167, 139, 250, 0.7)', 'rgba(244, 63, 94, 0.7)', 'rgba(107, 114, 128, 0.7)']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }

    const growthCanvas = document.getElementById('userGrowthChart') as HTMLCanvasElement;
    if (growthCanvas) {
      const ctx = growthCanvas.getContext('2d');
      if (ctx) {
        const labels = this.engagementAnalytics?.userGrowth?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = this.engagementAnalytics?.userGrowth?.data || [0, 0, 0, 0, 0, 0];
        this.userGrowthChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Active Users',
              data: data,
              borderColor: '#a78bfa',
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }

    const successCanvas = document.getElementById('pickupSuccessRateChart') as HTMLCanvasElement;
    if (successCanvas) {
      const ctx = successCanvas.getContext('2d');
      if (ctx) {
        const labels = this.engagementAnalytics?.pickupSuccessRate?.labels || ['Completed', 'Pending', 'Scheduled', 'Cancelled'];
        const data = this.engagementAnalytics?.pickupSuccessRate?.data || [0, 0, 0, 0];
        this.pickupSuccessRateChart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: ['#10b981', '#fbbf24', '#3b82f6', '#f43f5e']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }
  }

  private updateCharts() {
    if (!this.isBrowser) return;

    if (this.reportsEngagementChart) {
      const labels = this.engagementAnalytics?.trends?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const data = this.engagementAnalytics?.trends?.data || [0, 0, 0, 0, 0, 0, 0];
      this.reportsEngagementChart.data.labels = labels;
      this.reportsEngagementChart.data.datasets[0].data = data;
      this.reportsEngagementChart.update();
    }

    if (this.locationDistributionChart) {
      const labels = this.engagementAnalytics?.locationDistribution?.labels || ['Gachibowli', 'Madhapur', 'Miyapur', 'Hyderabad', 'Secunderabad'];
      const data = this.engagementAnalytics?.locationDistribution?.data || [45, 60, 30, 95, 55];
      this.locationDistributionChart.data.labels = labels;
      this.locationDistributionChart.data.datasets[0].data = data;
      this.locationDistributionChart.update();
    }

    if (this.wasteCategoriesChart) {
      const labels = this.engagementAnalytics?.wasteCategories?.labels || ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Paper'];
      const data = this.engagementAnalytics?.wasteCategories?.data || [120, 185, 45, 60, 95];
      this.wasteCategoriesChart.data.labels = labels;
      this.wasteCategoriesChart.data.datasets[0].data = data;
      this.wasteCategoriesChart.update();
    }

    if (this.monthlyCollectionsChart) {
      const labels = this.engagementAnalytics?.monthlyCollections?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const data = this.engagementAnalytics?.monthlyCollections?.data || [0, 0, 0, 0, 0, 0];
      this.monthlyCollectionsChart.data.labels = labels;
      this.monthlyCollectionsChart.data.datasets[0].data = data;
      this.monthlyCollectionsChart.update();
    }

    if (this.recyclingRateChart) {
      const labels = this.engagementAnalytics?.recyclingRate?.labels || ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Paper', 'Other'];
      const data = this.engagementAnalytics?.recyclingRate?.data || [0, 0, 0, 0, 0, 0];
      this.recyclingRateChart.data.labels = labels;
      this.recyclingRateChart.data.datasets[0].data = data;
      this.recyclingRateChart.update();
    }

    if (this.userGrowthChart) {
      const labels = this.engagementAnalytics?.userGrowth?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const data = this.engagementAnalytics?.userGrowth?.data || [0, 0, 0, 0, 0, 0];
      this.userGrowthChart.data.labels = labels;
      this.userGrowthChart.data.datasets[0].data = data;
      this.userGrowthChart.update();
    }

    if (this.pickupSuccessRateChart) {
      const labels = this.engagementAnalytics?.pickupSuccessRate?.labels || ['Completed', 'Pending', 'Scheduled', 'Cancelled'];
      const data = this.engagementAnalytics?.pickupSuccessRate?.data || [0, 0, 0, 0];
      this.pickupSuccessRateChart.data.labels = labels;
      this.pickupSuccessRateChart.data.datasets[0].data = data;
      this.pickupSuccessRateChart.update();
    }

    if (!this.reportsEngagementChart && !this.monthlyCollectionsChart && !this.recyclingRateChart && !this.userGrowthChart && !this.pickupSuccessRateChart && !this.locationDistributionChart && !this.wasteCategoriesChart) {
      this.initCharts();
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
    this.loadFeedbacks();

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
            completedPickups: analytics.completedPickups || 0,
            activeNgos: analytics.activeNgos || 0,
            pickupsToday: analytics.pickupsToday || 0,
            wasteRecycled: analytics.totalImpact || 0,
            estimatedRevenue: analytics.estimatedRevenue || 0
          });

          this.updateCharts();
        },
        error: (err: any) => console.error('Failed to load engagement analytics:', err)
      });
  }


  // --- Opportunities Management ---

  loadFeedbacks() {
    this.http.get('/api/feedback').subscribe({
      next: (res: any) => this.feedbacks = res,
      error: (err: any) => console.error('Failed to load feedbacks:', err)
    });
  }

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
    this.opportunityForm = {
      title: '', description: '', skills: '', duration: '', location: '',
      wasteType: [], status: 'open',
      startDate: '', startTime: '', scheduleType: 'none', scheduleDays: [], scheduleTime: ''
    };
    this.showOpportunityForm = true;
    this.viewingApplicationsFor = null;
  }

  toggleWasteType(type: string) {
    const idx = this.opportunityForm.wasteType.indexOf(type);
    if (idx > -1) {
      this.opportunityForm.wasteType = this.opportunityForm.wasteType.filter(t => t !== type);
    } else {
      this.opportunityForm.wasteType = [...this.opportunityForm.wasteType, type];
    }
  }

  isWasteTypeSelected(type: string): boolean {
    return this.opportunityForm.wasteType.includes(type);
  }

  toggleScheduleDay(day: string) {
    const max = this.opportunityForm.scheduleType === 'weekly-2' ? 2 : 3;
    const idx = this.opportunityForm.scheduleDays.indexOf(day);
    if (idx > -1) {
      this.opportunityForm.scheduleDays = this.opportunityForm.scheduleDays.filter(d => d !== day);
    } else if (this.opportunityForm.scheduleDays.length < max) {
      this.opportunityForm.scheduleDays = [...this.opportunityForm.scheduleDays, day];
    } else {
      Swal.fire({ title: `Max ${max} days`, text: `Please deselect a day first.`, icon: 'info', confirmButtonColor: '#10b981' });
    }
  }

  isScheduleDaySelected(day: string): boolean {
    return this.opportunityForm.scheduleDays.includes(day);
  }

  onScheduleTypeChange() {
    // Reset days when schedule type changes
    this.opportunityForm.scheduleDays = [];
  }

  openEditOpportunityForm(opp: Opportunity) {
    this.editingOpportunityId = opp._id || opp.id || null;
    let wt: string[] = [];
    const raw = (opp as any).wasteType;
    if (Array.isArray(raw)) {
      wt = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      wt = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    this.opportunityForm = {
      title: opp.title,
      description: opp.description,
      skills: opp.skills ? opp.skills.join(', ') : '',
      duration: opp.duration,
      location: opp.location,
      wasteType: wt,
      status: opp.status || 'open',
      startDate: opp.startDate || '',
      startTime: opp.startTime || '',
      scheduleType: (opp.scheduleType as any) || 'none',
      scheduleDays: Array.isArray(opp.scheduleDays) ? opp.scheduleDays : [],
      scheduleTime: opp.scheduleTime || ''
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

    // Validation
    if (this.opportunityForm.wasteType.length === 0) {
      Swal.fire({
        title: 'Waste Type Required',
        text: 'Please select at least one waste type.',
        icon: 'warning',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (this.opportunityForm.scheduleType === 'weekly-2' && this.opportunityForm.scheduleDays.length !== 2) {
      Swal.fire({
        title: 'Select 2 Days',
        text: 'Please select exactly 2 days for the weekly schedule.',
        icon: 'warning',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (this.opportunityForm.scheduleType === 'weekly-3' && this.opportunityForm.scheduleDays.length !== 3) {
      Swal.fire({
        title: 'Select 3 Days',
        text: 'Please select exactly 3 days for the weekly schedule.',
        icon: 'warning',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (this.opportunityForm.scheduleType !== 'none' && !this.opportunityForm.scheduleTime) {
      Swal.fire({
        title: 'Completion Time Required',
        text: 'Please specify the work completion time for the cleaning schedule.',
        icon: 'warning',
        confirmButtonColor: '#10b981'
      });
      return;
    }

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
    let filtered = [...this.allUsers];
    
    if (this.selectedUserRole) {
      filtered = filtered.filter(u => u.role === this.selectedUserRole);
    }
    
    if (this.globalSearchTerm.trim()) {
      const term = this.globalSearchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      );
    }
    
    this.filteredUsers = filtered;
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.isSuspended;
    const action = newStatus ? 'Suspend' : 'Unsuspend';
    const icon = newStatus ? 'warning' : 'info';
    
    Swal.fire({
      title: `${action} User?`,
      text: newStatus 
        ? `Are you sure you want to suspend ${user.name}? They will not be able to log in.`
        : `Are you sure you want to restore access for ${user.name}?`,
      icon,
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}`
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.setUserStatus(user.id, newStatus).subscribe({
          next: () => {
            user.isSuspended = newStatus;
          },
          error: (err) => {
            console.error('Failed to update user status:', err);
            Swal.fire('Error', 'Failed to update user status: ' + (err.error?.message || err.message), 'error');
          }
        });
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
    this.loadApplications(); // Refresh applications list to retrieve the latest candidates
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

  confirmUpdateApplicationStatus(appId: string | undefined, status: 'accepted' | 'rejected') {
    if (!appId) return;
    const actionLabel = status === 'accepted' ? 'Accept' : 'Reject';
    const iconType = status === 'accepted' ? 'success' : 'warning';
    Swal.fire({
      title: `${actionLabel} Application?`,
      text: status === 'accepted'
        ? 'This will accept the volunteer and mark the opportunity as In Progress.'
        : 'Are you sure you want to reject this application?',
      icon: iconType,
      showCancelButton: true,
      confirmButtonColor: status === 'accepted' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionLabel}`
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateApplicationStatus(appId, status);
      }
    });
  }


  getApplicationsForCurrentView() {
    if (!this.viewingApplicationsFor) return [];
    const targetId = String(this.viewingApplicationsFor);
    
    const filtered = this.applications.filter((app: any) => {
      const oppField = app.opportunity_id;
      // Handle populated object, plain ObjectId, or string
      const candidates: string[] = [];
      if (oppField) {
        if (typeof oppField === 'object') {
          if (oppField._id) candidates.push(String(oppField._id));
          if (oppField.id) candidates.push(String(oppField.id));
        } else {
          candidates.push(String(oppField));
        }
      }
      return candidates.some(c => c === targetId);
    });
    
    return filtered;
  }

  // --- Template helpers ---

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  asArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value) return [value];
    return [];
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

  downloadUserReportPDF() {
    try {
      this.adminReportService.exportUsersToPDF();
    } catch (e) {
      console.error('Error in downloadUserReportPDF:', e);
    }
  }

  downloadOpportunityReport() {
    try { 
      this.adminReportService.exportOpportunitiesToCSV(); 
    } catch (e) {
      console.error('Error in downloadOpportunityReport:', e);
    }
  }

  downloadApplicationReport() {
    try {
      this.adminReportService.exportApplicationsToCSV();
    } catch (e) {
      console.error('Error in downloadApplicationReport:', e);
    }
  }

  selectMenu(menuId: string) {
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

  setActiveMenu(menuId: string) {
    this.router.navigate(['/admin'], { queryParams: { tab: menuId } });
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
    const queryParams: any = {};
    if (partner.opportunityId) {
      queryParams.opportunityId = partner.opportunityId;
    }
    this.router.navigate(['/chat', partner.partnerId, partner.partnerName], { queryParams });
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

  // --- Rich Messaging Features ---

  showEmojiPicker = false;
  emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '🗑️', '♻️'];

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.newMessageContent += emoji;
    this.showEmojiPicker = false;
  }

  onChatFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.selectedPartner) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        this.chatService.sendMessage(
          this.selectedPartner!.partnerId, 
          '📷 Image attached', 
          'image', 
          base64Image,
          this.selectedPartner!.opportunityId
        );
        this.scrollToBottom();
      };
      reader.readAsDataURL(file);
    }
  }

  shareLocation(): void {
    if (!this.selectedPartner) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          this.chatService.sendMessage(
            this.selectedPartner!.partnerId, 
            '📍 Shared a location', 
            'location', 
            locationUrl,
            this.selectedPartner!.opportunityId
          );
          this.scrollToBottom();
        },
        (error) => {
          alert('Error getting location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  isRecording = false;
  mediaRecorder: any = null;
  audioChunks: any[] = [];

  async toggleRecording(): Promise<void> {
    if (!this.selectedPartner) return;
    
    if (this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.addEventListener('dataavailable', (event: any) => {
          this.audioChunks.push(event.data);
        });

        this.mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            this.chatService.sendMessage(
              this.selectedPartner!.partnerId, 
              '🎤 Voice Message', 
              'audio', 
              base64Audio,
              this.selectedPartner!.opportunityId
            );
            this.scrollToBottom();
          };
          stream.getTracks().forEach(track => track.stop());
        });

        this.mediaRecorder.start();
        this.isRecording = true;
      } catch (err) {
        alert('Could not access microphone: ' + err);
      }
    }
  }

  // --- End Rich Messaging Features ---

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

  ngOnDestroy() {
    if (this.reportsEngagementChart) {
      this.reportsEngagementChart.destroy();
    }
    if (this.locationDistributionChart) {
      this.locationDistributionChart.destroy();
    }
    if (this.wasteCategoriesChart) {
      this.wasteCategoriesChart.destroy();
    }
  }
}
