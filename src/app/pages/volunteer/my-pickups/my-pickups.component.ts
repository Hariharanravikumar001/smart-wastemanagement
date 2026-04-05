import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, map, timer, switchMap, combineLatest, BehaviorSubject, catchError, shareReplay, of } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-pickups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-pickups.component.html',
  styleUrls: ['./my-pickups.component.css']
})
export class MyPickupsComponent implements OnInit {
  currentUser: User | null = null;
  activePickups$: Observable<WasteRequest[]> = new Observable();
  completedPickups$: Observable<WasteRequest[]> = new Observable();
  
  // For weighted completion
  weightInput: number = 0;
  completingRequestId: string | null = null;

  // Smart Route Mode
  smartRouteMode = false;
  smartRouteOrder: WasteRequest[] = [];

  // Detailed view
  selectedRequest: WasteRequest | null = null;
  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const dataStream = combineLatest([
          this.refreshSubject,
          timer(0, 30000)
        ]).pipe(
          map(() => user),
          shareReplay(1)
        );

        const myRequests$ = dataStream.pipe(
          switchMap(u => this.wasteService.getRequestsByVolunteer(u!.id).pipe(
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.activePickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );

        this.completedPickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed'))
        );

        this.activePickups$.subscribe(actives => {
          this.calculateSmartRoute(actives);
        });
      }
    });
  }

  refreshData() {
    this.refreshSubject.next();
  }

  updateStatus(requestId: string, status: WasteRequest['status']) {
    this.wasteService.updateRequest(requestId, { status }).subscribe({
        next: () => this.refreshData(),
        error: (err: any) => alert('Failed to update status: ' + (err.error?.message || err.message))
    });
  }

  startCompletion(requestId: string) {
    this.completingRequestId = requestId;
    this.weightInput = 0;
  }

  toggleSmartRoute() {
    this.smartRouteMode = !this.smartRouteMode;
  }

  private calculateSmartRoute(actives: WasteRequest[]) {
    // Simulated Traveling Salesperson Problem (TSP) Heuristic
    // In a real environment, this would hit Mapbox / Google Directions API
    // Here we sort them based on purely arbitrary 'closest location' alphanumeric heuristic simulation
    this.smartRouteOrder = [...actives].sort((a, b) => {
        // Arbitrary scoring to simulate distance mapping
        const scoreA = a.location.length + (a.status === 'In Progress' ? -100 : 0);
        const scoreB = b.location.length + (b.status === 'In Progress' ? -100 : 0);
        return scoreA - scoreB;
    });
  }

  cancelCompletion() {
    this.completingRequestId = null;
  }

  completePickup() {
    if (this.completingRequestId && this.weightInput > 0) {
      this.wasteService.updateRequest(this.completingRequestId, {
        status: 'Completed',
        weight: this.weightInput
      }).subscribe({
          next: () => {
              alert('Pickup marked as completed! Job well done.');
              this.refreshData();
          },
          error: (err: any) => alert('Failed to complete pickup: ' + (err.error?.message || err.message))
      });
      this.completingRequestId = null;
    }
  }

  viewDetails(req: WasteRequest) {
    this.selectedRequest = req;
  }

  closeDetails() {
    this.selectedRequest = null;
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
}
