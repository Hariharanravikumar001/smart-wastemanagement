import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { User, AuthService } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-volunteer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  assignments$: Observable<WasteRequest[]> = of([]);
  availablePickups$: Observable<WasteRequest[]> = of([]);
  completedCount$: Observable<number> = of(0);
  totalWeight$: Observable<number> = of(0);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.assignments$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.volunteerId === user.id && r.status !== 'Completed'))
        );

        this.availablePickups$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Pending'))
        );

        const history$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.volunteerId === user.id && r.status === 'Completed'))
        );

        this.completedCount$ = history$.pipe(map(reqs => reqs.length));
        this.totalWeight$ = history$.pipe(
          map(reqs => reqs.reduce((sum, r) => sum + (r.weight || 0), 0))
        );
      }
    });
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }
}
