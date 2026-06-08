import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map, combineLatest, BehaviorSubject, switchMap, timer, catchError, shareReplay } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-pickup-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QRCodeModule],
  templateUrl: './pickup-history.component.html',
  styleUrls: ['./pickup-history.component.css']
})
export class PickupHistoryComponent implements OnInit {
  currentUser: User | null = null;
  activeRequests$: Observable<WasteRequest[]> = of([]);
  historyRequests$: Observable<WasteRequest[]> = of([]);
  private refreshSubject = new BehaviorSubject<void>(undefined);

  // Reschedule state
  reschedulingId: string | null = null;
  rescheduleDate = '';
  rescheduleTime = '';
  rescheduleError = '';
  rescheduleSuccess = '';

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const dataStream = combineLatest([
          this.refreshSubject,
          timer(0, 30000)
        ]).pipe(map(() => user));

        const allRequests$ = dataStream.pipe(
          switchMap(u => this.wasteService.getRequestsByCitizen(u!.id).pipe(
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        const filteredRequests$ = combineLatest([
          allRequests$,
          this.searchService.searchTerm$
        ]).pipe(
          map(([reqs, query]) => {
            if (!query || !query.trim()) return reqs;
            const q = query.toLowerCase().trim();
            return reqs.filter(r => {
              const cat = r.wasteCategory as any;
              return r.description?.toLowerCase().includes(q) ||
                r.location?.toLowerCase().includes(q) ||
                (Array.isArray(cat) ? cat.some((c: any) => c.toString().toLowerCase().includes(q)) : typeof cat === 'string' && (cat as string).toLowerCase().includes(q));
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

  refreshData() {
    this.refreshSubject.next();
  }

  openReschedule(req: WasteRequest) {
    this.reschedulingId = req.id || null;
    this.rescheduleDate = req.scheduledDate ? new Date(req.scheduledDate).toISOString().split('T')[0] : '';
    this.rescheduleTime = req.scheduledTime || '';
    this.rescheduleError = '';
    this.rescheduleSuccess = '';
  }

  cancelReschedule() {
    this.reschedulingId = null;
    this.rescheduleDate = '';
    this.rescheduleTime = '';
    this.rescheduleError = '';
  }

  submitReschedule() {
    if (!this.reschedulingId || (!this.rescheduleDate && !this.rescheduleTime)) {
      this.rescheduleError = 'Please provide a new date or time.';
      return;
    }
    this.wasteService.rescheduleRequest(this.reschedulingId, this.rescheduleDate, this.rescheduleTime).subscribe({
      next: () => {
        this.rescheduleSuccess = '✅ Pickup rescheduled successfully!';
        this.rescheduleError = '';
        setTimeout(() => {
          this.reschedulingId = null;
          this.rescheduleSuccess = '';
          this.refreshData();
        }, 1500);
      },
      error: (err) => {
        this.rescheduleError = err.error?.message || 'Failed to reschedule. Please try again.';
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

  formatCategories(cat: string | string[]): string {
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
  }

  trackingRequestId: string | null = null;
  private trackingMap: any;

  trackLive(id: string) {
    if (this.trackingRequestId === id) {
      this.trackingRequestId = null;
      if (this.trackingMap) {
        this.trackingMap.remove();
        this.trackingMap = null;
      }
      return;
    }
    
    this.trackingRequestId = id;
    
    setTimeout(() => {
      import('leaflet').then(L => {
        const mapId = 'tracking-map-' + id;
        if (this.trackingMap) {
          this.trackingMap.remove();
        }
        
        // Use a generic center or the user's location if available
        const lat = 20.5937;
        const lng = 78.9629;
        
        this.trackingMap = L.map(mapId).setView([lat, lng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.trackingMap);

        // Add a marker for the volunteer
        const volunteerMarker = L.marker([lat, lng]).addTo(this.trackingMap)
          .bindPopup('<b>Volunteer Location</b><br>Arriving soon!').openPopup();

        // Simulate volunteer moving
        let currentLat = lat;
        let currentLng = lng;
        const moveInterval = setInterval(() => {
          if (!this.trackingMap || this.trackingRequestId !== id) {
            clearInterval(moveInterval);
            return;
          }
          currentLat += (Math.random() - 0.5) * 0.005;
          currentLng += (Math.random() - 0.5) * 0.005;
          volunteerMarker.setLatLng([currentLat, currentLng]);
          this.trackingMap.panTo([currentLat, currentLng]);
        }, 3000);
      });
    }, 100);
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
