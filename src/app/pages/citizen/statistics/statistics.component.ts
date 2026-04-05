import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, map } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {
  currentUser: User | null = null;
  totalWeight$: Observable<number> = of(0);
  impactScore$: Observable<number> = of(0);
  completedCount$: Observable<number> = of(0);
  wasteStats$: Observable<{category: string, weight: number, percentage: number}[]> = of([]);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const userRequests$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.citizenId === user.id && r.status === 'Completed'))
        );

        this.totalWeight$ = userRequests$.pipe(
          map(reqs => reqs.reduce((sum, r) => sum + (r.weight || 0), 0))
        );

        this.impactScore$ = this.totalWeight$.pipe(
          map(weight => Math.round(weight * 18.5))
        );

        this.completedCount$ = userRequests$.pipe(
          map(reqs => reqs.length)
        );

        this.wasteStats$ = userRequests$.pipe(
          map(reqs => {
            const total = reqs.reduce((sum, r) => sum + (r.weight || 0), 0);
            if (total === 0) return [];
            const categories = [...new Set(reqs.flatMap(r => Array.isArray(r.wasteCategory) ? r.wasteCategory : [r.wasteCategory]))];
            return categories.map(cat => {
              const catWeight = reqs.filter(r => (Array.isArray(r.wasteCategory) ? r.wasteCategory.includes(cat) : r.wasteCategory === cat)).reduce((sum, r) => sum + (r.weight || 0), 0);
              return { category: cat, weight: catWeight, percentage: Math.round((catWeight / total) * 100) };
            }).sort((a, b) => b.weight - a.weight);
          })
        );
      }
    });
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
