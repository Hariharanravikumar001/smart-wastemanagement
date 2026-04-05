import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, map, combineLatest, catchError, BehaviorSubject, switchMap, timer, shareReplay } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';
import { MatchingService } from '../../../services/matching.service';
import { ApplicationService } from '../../../services/application.service';
import { Opportunity } from '../../../models/opportunity.model';
import { Application } from '../../../models/application.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opportunities.component.html',
  styleUrls: ['./opportunities.component.css']
})
export class OpportunitiesComponent implements OnInit {
  currentUser: User | null = null;
  ngoOpportunities$: Observable<Opportunity[]> = of([]);
  pickupOpportunities$: Observable<WasteRequest[]> = of([]);
  activeTab: 'pickups' | 'projects' = 'pickups';
  volunteerApplications: Application[] = [];

  searchQuery: string = '';
  
  private refreshSubject = new BehaviorSubject<void>(undefined);
  private searchSubject = new BehaviorSubject<string>('');

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private matchingService: MatchingService,
    private applicationService: ApplicationService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Refresh every 30 seconds + manual triggers
        const dataStream = combineLatest([
          this.refreshSubject,
          timer(0, 30000)
        ]).pipe(
          map(() => user)
        );

        const myApps$ = dataStream.pipe(
          switchMap(() => this.applicationService.getVolunteerApplications().pipe(
            map(res => (res as any)?.applications || (Array.isArray(res) ? res : [])),
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        myApps$.subscribe(apps => this.volunteerApplications = apps);

        this.ngoOpportunities$ = combineLatest([
          dataStream.pipe(
            switchMap(() => this.matchingService.getMatches().pipe(
              catchError(() => of([]))
            ))
          ),
          myApps$,
          this.searchSubject
        ]).pipe(
          map(([oppsRes, apps, query]) => {
            let opps = (oppsRes as any)?.opportunities || (Array.isArray(oppsRes) ? oppsRes : []);
            
            // Apply Search Filtering
            if (query && query.trim()) {
              const q = query.toLowerCase().trim();
              opps = opps.filter((o: any) => 
                o.title?.toLowerCase().includes(q) || 
                o.location?.toLowerCase().includes(q) ||
                o.description?.toLowerCase().includes(q)
              );
            }

            return opps.filter((opp: any) => {
              const oppId = (opp._id || opp.id)?.toString();
              if (!oppId) return false;
              
              // Filter out projects that are already accepted OR rejected (stay only if pending or not applied)
              const app = apps.find((a: any) => {
                const aid = (a.opportunity_id as any)?.id?.toString() || 
                             (a.opportunity_id as any)?._id?.toString() || 
                             (typeof a.opportunity_id === 'string' ? a.opportunity_id : null);
                return aid === oppId;
              });

              if (app && (app.status === 'accepted' || app.status === 'rejected')) return false;
              return true;
            });
          }),
          shareReplay(1)
        );

        this.pickupOpportunities$ = combineLatest([
          dataStream.pipe(
            switchMap(() => this.wasteService.getAvailableRequests().pipe(
              catchError(() => of([]))
            ))
          ),
          this.searchSubject
        ]).pipe(
          map(([reqs, query]) => {
            if (!query || !query.trim()) return reqs;
            const q = query.toLowerCase().trim();
            return reqs.filter(r => {
              const cat = r.wasteCategory as any;
              return r.location?.toLowerCase().includes(q) || 
                r.description?.toLowerCase().includes(q) ||
                (Array.isArray(cat) ? cat.some((c: any) => c.toString().toLowerCase().includes(q)) : cat?.toLowerCase().includes(q));
            });
          })
        );
      }
    });
  }

  refreshData() {
    this.refreshSubject.next();
  }

  hasApplied(oppId: string | undefined): boolean {
    if (!oppId) return false;
    const targetId = oppId.toString();
    return this.volunteerApplications.some(app => {
      const aid = (app.opportunity_id as any)?.id?.toString() || 
                  (app.opportunity_id as any)?._id?.toString() || 
                  app.opportunity_id?.toString();
      return aid === targetId;
    });
  }

  getApplicationStatus(oppId: string | undefined): string {
    if (!oppId) return '';
    const targetId = oppId.toString();
    const app = this.volunteerApplications.find(a => {
      const aid = (a.opportunity_id as any)?.id?.toString() || 
                  (a.opportunity_id as any)?._id?.toString() || 
                  a.opportunity_id?.toString();
      return aid === targetId;
    });
    return app ? app.status : '';
  }

  acceptPickup(request: WasteRequest) {
    if (!this.currentUser) return;
    this.wasteService.acceptPickup(request.id, this.currentUser.id, this.currentUser.name).subscribe({
      next: () => {
        alert('Pickup accepted successfully!');
        this.refreshData();
      },
      error: (err: any) => alert('Failed to accept pickup: ' + (err.error?.message || err.message))
    });
  }

  applyForProject(project: Opportunity): void {
    if (!this.currentUser) return;
    this.applicationService.applyForOpportunity(project._id || project.id!).subscribe({
      next: () => {
        alert(`Successfully applied for: ${project.title}`);
        this.refreshData();
      },
      error: (err) => alert('Application failed: ' + (err.error?.message || err.message))
    });
  }

  setTab(tab: 'pickups' | 'projects'): void {
    this.activeTab = tab;
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
}
