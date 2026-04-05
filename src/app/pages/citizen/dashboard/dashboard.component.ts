import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, map, timer, switchMap, BehaviorSubject, combineLatest, catchError, shareReplay } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { User, AuthService } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @Output() setTab = new EventEmitter<string>();
  currentUser: User | null = null;
  
  recentRequests$: Observable<WasteRequest[]> = of([]);
  activeRequests$: Observable<WasteRequest[]> = of([]);
  historyRequests$: Observable<WasteRequest[]> = of([]);
  totalWeight$: Observable<number> = of(0);
  impactScore$: Observable<number> = of(0);
  completedCount$: Observable<number> = of(0);
  wasteStats$: Observable<{category: string, weight: number, percentage: number}[]> = of([]);
  recentConversations$: Observable<any[]> = of([]);
  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (this.currentUser) {
        const dataStream = combineLatest([
          this.refreshSubject,
          timer(0, 30000)
        ]).pipe(
          map(() => user),
          shareReplay(1)
        );

        this.recentRequests$ = dataStream.pipe(
          switchMap(u => this.wasteService.getRequestsByCitizen(u!.id).pipe(
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.activeRequests$ = this.recentRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );
        this.historyRequests$ = this.recentRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed' || r.status === 'Cancelled'))
        );
        this.recalcStats();
        this.recentConversations$ = this.chatService.getConversations().pipe(
          map(convs => convs.slice(0, 3))
        );
      }
    });
  }

  refreshData() {
    this.refreshSubject.next();
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
        return categories.map(cat => {
          const catWeight = collected.filter(r => (Array.isArray(r.wasteCategory) ? r.wasteCategory.includes(cat) : r.wasteCategory === cat)).reduce((sum, r) => sum + (r.weight || 0), 0);
          return { category: cat, weight: catWeight, percentage: Math.round((catWeight / total) * 100) };
        }).sort((a, b) => b.weight - a.weight);
      })
    );
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
