import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, map, timer, combineLatest, switchMap } from 'rxjs';
import { WasteRequest } from '../../../../models/waste-request.model';
import { User } from '../../../../services/auth.service';
import { WasteRequestService } from '../../../../services/waste-request.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './citizen-dashboard.component.html',
  styleUrls: ['./citizen-dashboard.component.css']
})
export class CitizenDashboardComponent implements OnInit, OnChanges {
  @Input() currentUser: User | null = null;
  @Input() activeTab: string = 'overview';
  @Output() setTab = new EventEmitter<string>();

  recentRequests$: Observable<WasteRequest[]> = of([]);
  activeRequests$: Observable<WasteRequest[]> = of([]);
  historyRequests$: Observable<WasteRequest[]> = of([]);
  totalWeight$: Observable<number> = of(0);
  impactScore$: Observable<number> = of(0);
  completedCount$: Observable<number> = of(0);
  wasteStats$: Observable<{category: string, weight: number, percentage: number}[]> = of([]);

  newRequest: Partial<WasteRequest> = {
    wasteCategory: [],
    description: '',
    location: ''
  };
  categories: string[] = ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'];
  submitSuccess = false;

  selectedRequest: WasteRequest | null = null;

  private categoryDistributionChart: any;
  private currentStats: any[] = [];
  private isBrowser: boolean;

  constructor(
    private wasteService: WasteRequestService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  showDetails(req: WasteRequest) {
    this.selectedRequest = req;
  }

  toggleCategory(cat: string) {
    if (!Array.isArray(this.newRequest.wasteCategory)) {
        this.newRequest.wasteCategory = [];
    }
    const idx = this.newRequest.wasteCategory.indexOf(cat);
    if (idx === -1) {
        this.newRequest.wasteCategory.push(cat);
    } else {
        this.newRequest.wasteCategory.splice(idx, 1);
    }
  }

  closeDetails() {
    this.selectedRequest = null;
  }

  ngOnInit() {
    if (this.currentUser) {
      this.recentRequests$ = timer(0, 300000).pipe(
        switchMap(() => this.wasteService.getRequestsByCitizen(this.currentUser!.id)),
        map(res => {
          return Array.isArray(res) ? res : (res && (res as any).requests ? (res as any).requests : []);
        })
      );
      this.activeRequests$ = this.recentRequests$.pipe(
        map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
      );
      this.historyRequests$ = this.recentRequests$.pipe(
        map(reqs => reqs.filter(r => r.status === 'Completed' || r.status === 'Cancelled'))
      );
      this.newRequest.location = this.currentUser.location || '';
      this.recalcStats();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isBrowser && changes['activeTab'] && this.activeTab === 'statistics') {
      setTimeout(() => {
        this.ngZone.runOutsideAngular(() => {
          this.initCategoryDistributionChart();
        });
      }, 0);
    }
  }

  onSubmitPickup() {
    if (!this.currentUser) return;
    if (!this.newRequest.wasteCategory || this.newRequest.wasteCategory.length === 0 || !this.newRequest.description) return;
    
    this.wasteService.createRequest({
      ...this.newRequest,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.newRequest = {
          wasteCategory: [],
          description: '',
          location: this.currentUser?.location || ''
        };
        
        this.recalcStats();
        setTimeout(() => this.submitSuccess = false, 4000);
      },
      error: (err) => {
         console.error('Submit pickup request failed:', err);
         alert('Failed to submit pickup request. Please try again or check your connection.');
      }
    });
  }

  private recalcStats() {
    if (!this.currentUser) return;
    this.totalWeight$ = this.recentRequests$.pipe(
      map(reqs => reqs.filter(r => r.status === 'Completed').reduce((sum, r) => sum + (r.weight || 0), 0))
    );
    this.impactScore$ = this.totalWeight$.pipe(
      map(weight => Math.round(weight * 18.5))
    );
    this.completedCount$ = this.recentRequests$.pipe(
      map(reqs => reqs.filter(r => r.status === 'Completed').length)
    );
    this.wasteStats$ = this.recentRequests$.pipe(
      map(reqs => {
        const collected = reqs.filter(r => r.status === 'Completed');
        const total = collected.reduce((sum, r) => sum + (r.weight || 0), 0);
        if (total === 0) return [];
        const categories = [...new Set(collected.flatMap(r => Array.isArray(r.wasteCategory) ? r.wasteCategory : [r.wasteCategory]))];
        const result = categories.map(cat => {
          const catWeight = collected.filter(r => (Array.isArray(r.wasteCategory) ? r.wasteCategory.includes(cat) : r.wasteCategory === cat)).reduce((sum, r) => sum + (r.weight || 0), 0);
          return { category: cat, weight: catWeight, percentage: Math.round((catWeight / total) * 100) };
        }).sort((a, b) => b.weight - a.weight);
        
        this.currentStats = result;
        if (this.isBrowser && this.activeTab === 'statistics') {
          setTimeout(() => {
            this.ngZone.runOutsideAngular(() => this.updateCategoryDistributionChart());
          }, 0);
        }
        return result;
      })
    );
  }

  private initCategoryDistributionChart() {
    const ctx = document.getElementById('citizenCategoryChart') as HTMLCanvasElement;
    if (ctx) {
      if (this.categoryDistributionChart) {
        this.categoryDistributionChart.destroy();
      }
      this.categoryDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
      this.updateCategoryDistributionChart();
    }
  }

  private updateCategoryDistributionChart() {
    if (this.categoryDistributionChart && this.currentStats.length > 0) {
      const labels = this.currentStats.map(s => s.category);
      const data = this.currentStats.map(s => s.weight);
      const bgColors = this.currentStats.map(s => this.getCategoryColor(s.category));

      this.categoryDistributionChart.data.labels = labels;
      this.categoryDistributionChart.data.datasets[0].data = data;
      this.categoryDistributionChart.data.datasets[0].backgroundColor = bgColors;
      this.categoryDistributionChart.update();
    }
  }

  getCategoryIcon(cat: string | string[]): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }

  getCategoryColor(cat: string | string[]): string {
    const colors: Record<string, string> = {
      'Plastic': '#00c8ff', 'Organic': '#63ffb4', 'E-Waste': '#a78bfa', 'Metal': '#f59e0b',
      'Glass': '#06b6d4', 'Paper': '#f97316', 'Hazardous': '#ef4444', 'Other': '#8b5cf6'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? colors[cat[0]] || '#63ffb4' : '#63ffb4';
    }
    return colors[cat] || '#63ffb4';
  }

  formatCategories(cat: string | string[]): string {
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
  }
}
