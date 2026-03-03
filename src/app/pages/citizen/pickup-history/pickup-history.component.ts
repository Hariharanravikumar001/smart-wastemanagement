import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, map } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-pickup-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pickup-history.component.html',
  styleUrls: ['./pickup-history.component.css']
})
export class PickupHistoryComponent implements OnInit {
  currentUser: User | null = null;
  activeRequests$: Observable<WasteRequest[]> = of([]);
  historyRequests$: Observable<WasteRequest[]> = of([]);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const userRequests$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.citizenId === user.id))
        );

        this.activeRequests$ = userRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );

        this.historyRequests$ = userRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed' || r.status === 'Cancelled'))
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'Pending': 'pending',
      'Scheduled': 'scheduled',
      'In Progress': 'inprogress',
      'Completed': 'completed',
      'Cancelled': 'cancelled'
    };
    return classes[status] || '';
  }
}
