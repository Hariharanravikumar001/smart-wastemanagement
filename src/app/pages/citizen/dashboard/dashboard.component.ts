import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, map, timer, switchMap, BehaviorSubject, combineLatest, catchError, shareReplay } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { User, AuthService } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { SearchService } from '../../../services/search.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isBrowser = typeof window !== 'undefined';
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



  liveLocation: { lat: number, lng: number } | null = null;
  private trackingMap: any = null;
  private citizenMarker: any = null;
  private volunteerMarker: any = null;
  private locationSub: any = null;

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private chatService: ChatService,
    private searchService: SearchService,
    private http: HttpClient
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

        this.recentRequests$ = combineLatest([
          dataStream.pipe(
            switchMap(u => this.wasteService.getRequestsByCitizen(u!.id).pipe(
              catchError(() => of([]))
            ))
          ),
          this.searchService.searchTerm$
        ]).pipe(
          map(([reqs, query]) => {
            if (!query) return reqs;
            const q = query.toLowerCase().trim();
            return reqs.filter(r => 
              (r.description && r.description.toLowerCase().includes(q)) || 
              (r.location && JSON.stringify(r.location).toLowerCase().includes(q))
            );
          }),
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

    this.locationSub = this.chatService.volunteerLocation$.subscribe(data => {
      if (data) {
        this.activeRequests$.subscribe(actives => {
          if (actives.length > 0) {
            const activeReq = actives[0];
            if (activeReq.volunteerId === data.volunteerId) {
              this.liveLocation = { lat: data.lat, lng: data.lng };
              this.updateTrackingMap(activeReq.location, data.lat, data.lng);
            }
          }
        });
      } else {
        this.liveLocation = null;
        if (this.trackingMap) {
          this.trackingMap.remove();
          this.trackingMap = null;
          this.citizenMarker = null;
          this.volunteerMarker = null;
        }
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



  // Feedback State
  feedbackContent: string = '';
  isSubmittingFeedback: boolean = false;
  feedbackSuccess: boolean = false;
  feedbackError: string | null = null;

  submitFeedback() {
    if (!this.feedbackContent.trim()) return;
    this.isSubmittingFeedback = true;
    this.feedbackError = null;
    this.feedbackSuccess = false;
    
    this.http.post('/api/feedback', { content: this.feedbackContent }).subscribe({
      next: () => {
        this.isSubmittingFeedback = false;
        this.feedbackSuccess = true;
        this.feedbackContent = '';
        setTimeout(() => this.feedbackSuccess = false, 5000);
      },
      error: (err) => {
        this.isSubmittingFeedback = false;
        this.feedbackError = 'Failed to submit feedback. Please try again later.';
      }
    });
  }

  updateTrackingMap(locationString: string, volunteerLat: number, volunteerLng: number) {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const mapContainer = document.getElementById('trackingMap');
      if (!mapContainer) return;

      import('leaflet').then(L => {
        const centerLat = 20.5937;
        const centerLng = 78.9629;
        const offsetLat = (locationString.length % 10) * 0.5 - 2.5;
        const offsetLng = (locationString.length % 8) * 0.5 - 2.0;
        const citizenLat = centerLat + offsetLat;
        const citizenLng = centerLng + offsetLng;

        if (!this.trackingMap) {
          this.trackingMap = L.map('trackingMap').setView([citizenLat, citizenLng], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(this.trackingMap);

          const citizenIcon = L.divIcon({
            html: '<div style="font-size: 24px;">🏡</div>',
            className: 'citizen-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          this.citizenMarker = L.marker([citizenLat, citizenLng], { icon: citizenIcon }).addTo(this.trackingMap)
            .bindPopup('<b>Your Home</b>').openPopup();

          const truckIcon = L.divIcon({
            html: '<div style="font-size: 28px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); transform: scaleX(-1); display: inline-block;">🚛</div>',
            className: 'truck-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          this.volunteerMarker = L.marker([volunteerLat, volunteerLng], { icon: truckIcon }).addTo(this.trackingMap)
            .bindPopup('<b>Volunteer is on the way</b>');
        } else {
          this.volunteerMarker.setLatLng([volunteerLat, volunteerLng]);
        }

        const bounds = L.latLngBounds([
          [citizenLat, citizenLng],
          [volunteerLat, volunteerLng]
        ]);
        this.trackingMap.fitBounds(bounds, { padding: [30, 30] });
      });
    }, 100);
  }

  ngOnDestroy() {
    if (this.locationSub) {
      this.locationSub.unsubscribe();
    }
    if (this.trackingMap) {
      this.trackingMap.remove();
      this.trackingMap = null;
      this.citizenMarker = null;
      this.volunteerMarker = null;
    }
  }
}
