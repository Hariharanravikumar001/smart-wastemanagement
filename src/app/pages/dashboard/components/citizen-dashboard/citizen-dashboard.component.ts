import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, map } from 'rxjs';
import { WasteRequest } from '../../../../models/waste-request.model';
import { User } from '../../../../services/auth.service';
import { WasteRequestService } from '../../../../services/waste-request.service';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './citizen-dashboard.component.html',
  styleUrls: ['./citizen-dashboard.component.css']
})
export class CitizenDashboardComponent implements OnInit {
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
    wasteCategory: 'Plastic',
    description: '',
    location: ''
  };
  categories: WasteRequest['wasteCategory'][] = ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'];
  submitSuccess = false;

  constructor(private wasteService: WasteRequestService) {}

  ngOnInit() {
    if (this.currentUser) {
      this.recentRequests$ = this.wasteService.requests$.pipe(
        map(reqs => reqs.filter(r => r.citizenId === this.currentUser?.id))
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

  onSubmitPickup() {
    if (!this.currentUser) return;
    if (!this.newRequest.wasteCategory || !this.newRequest.description) return;
    
    this.wasteService.createRequest({
      ...this.newRequest,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.newRequest = {
          wasteCategory: 'Plastic',
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
        const categories = [...new Set(collected.map(r => r.wasteCategory))];
        return categories.map(cat => {
          const catWeight = collected.filter(r => r.wasteCategory === cat).reduce((sum, r) => sum + (r.weight || 0), 0);
          return { category: cat, weight: catWeight, percentage: Math.round((catWeight / total) * 100) };
        }).sort((a, b) => b.weight - a.weight);
      })
    );
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }

  getCategoryColor(cat: string): string {
    const colors: Record<string, string> = {
      'Plastic': '#00c8ff', 'Organic': '#63ffb4', 'E-Waste': '#a78bfa', 'Metal': '#f59e0b',
      'Glass': '#06b6d4', 'Paper': '#f97316', 'Hazardous': '#ef4444', 'Other': '#8b5cf6'
    };
    return colors[cat] || '#63ffb4';
  }
}
