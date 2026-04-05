import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, map, combineLatest, BehaviorSubject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-pickup-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pickup-history.component.html',
  styleUrls: ['./pickup-history.component.css']
})
export class PickupHistoryComponent implements OnInit {
  currentUser: User | null = null;
  activeRequests$: Observable<WasteRequest[]> = of([]);
  historyRequests$: Observable<WasteRequest[]> = of([]);
  searchQuery: string = '';
  private searchSubject = new BehaviorSubject<string>('');

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const filteredRequests$ = combineLatest([
          this.wasteService.requests$.pipe(
            map(reqs => reqs.filter(r => r.citizenId === user.id))
          ),
          this.searchSubject
        ]).pipe(
          map(([reqs, query]) => {
            if (!query || !query.trim()) return reqs;
            const q = query.toLowerCase().trim();
            return reqs.filter(r => {
              const cat = r.wasteCategory as any;
              return r.description?.toLowerCase().includes(q) || 
                r.location?.toLowerCase().includes(q) ||
                (Array.isArray(cat) ? cat.some((c: any) => c.toString().toLowerCase().includes(q)) : cat?.toLowerCase().includes(q));
            });
          })
        );

        this.activeRequests$ = filteredRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );

        this.historyRequests$ = filteredRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed' || r.status === 'Cancelled'))
        );
      }
    });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
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

  formatCategories(cat: string | string[]): string {
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
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

  formatLocation(loc: string | undefined): string {
    if (!loc) return '';
    // Basic deduplication: "Tamil NaduTamil Nadu" -> "Tamil Nadu"
    const half = Math.floor(loc.length / 2);
    if (loc.length > 0 && loc.length % 2 === 0) {
      const firstHalf = loc.substring(0, half);
      const secondHalf = loc.substring(half);
      if (firstHalf === secondHalf) return firstHalf;
    }
    return loc;
  }
}
