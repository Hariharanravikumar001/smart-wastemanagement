import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map, combineLatest, catchError, BehaviorSubject, switchMap, timer, shareReplay } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { User, AuthService } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';
import { ChatService } from '../../../services/chat.service';
import { MatchingService } from '../../../services/matching.service';
import { ApplicationService } from '../../../services/application.service';
import { OpportunityService } from '../../../services/opportunity.service';
import { Opportunity } from '../../../models/opportunity.model';
import { Application } from '../../../models/application.model';

@Component({
  selector: 'app-volunteer-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @Output() setTab = new EventEmitter<string>();
  currentUser: User | null = null;
  
  assignments$: Observable<WasteRequest[]> = of([]);
  availablePickups$: Observable<WasteRequest[]> = of([]);
  availableNGOProjects$: Observable<Opportunity[]> = of([]);
  acceptedNGOProjects$: Observable<Application[]> = of([]);
  myApplications$: Observable<Application[]> = of([]);
  volunteerApplications: Application[] = [];

  completedCount$: Observable<number> = of(0);
  totalWeight$: Observable<number> = of(0);
  unreadMessages$: Observable<number> = this.chatService.unreadCount$;
  recentConversations$: Observable<any[]> = of([]);

  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private chatService: ChatService,
    private matchingService: MatchingService,
    private applicationService: ApplicationService,
    private opportunityService: OpportunityService
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

        this.myApplications$ = dataStream.pipe(
          switchMap(() => this.applicationService.getVolunteerApplications().pipe(
            map(res => {
               const apps = (res as any)?.applications || (Array.isArray(res) ? res : []);
               this.volunteerApplications = apps;
               return apps;
            }),
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.acceptedNGOProjects$ = this.myApplications$.pipe(
          map(apps => apps.filter((a: any) => a.status === 'accepted' && (a.opportunity_id as any)?.status !== 'closed'))
        );

        this.availableNGOProjects$ = combineLatest([
          dataStream.pipe(
            switchMap(() => this.matchingService.getMatches().pipe(
              catchError(() => of([]))
            ))
          ),
          this.myApplications$
        ]).pipe(
          map(([oppsRes, apps]) => {
            const opps = (oppsRes as any)?.opportunities || (Array.isArray(oppsRes) ? oppsRes : []);
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

        this.assignments$ = dataStream.pipe(
          switchMap(() => this.wasteService.getRequestsByVolunteer(user.id).pipe(
            map(reqs => reqs.filter(r => r.status !== 'Completed')),
            catchError(() => of([]))
          ))
        );

        this.availablePickups$ = dataStream.pipe(
          switchMap(() => this.wasteService.getAvailableRequests().pipe(
            catchError(() => of([]))
          ))
        );

        const history$ = dataStream.pipe(
          switchMap(() => this.wasteService.getRequestsByVolunteer(user.id).pipe(
            map(reqs => reqs.filter(r => r.status === 'Completed')),
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.completedCount$ = history$.pipe(map(reqs => reqs.length));
        this.totalWeight$ = history$.pipe(
          map(reqs => reqs.reduce((sum, r) => sum + (r.weight || 0), 0))
        );

        this.recentConversations$ = this.chatService.getConversations().pipe(
          map(convs => convs.slice(0, 3))
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
      const oid = (app.opportunity_id as any)?.id?.toString() || 
                 (app.opportunity_id as any)?._id?.toString() || 
                 app.opportunity_id?.toString();
      return oid === targetId;
    });
  }

  getApplicationStatus(oppId: string | undefined): string {
    if (!oppId) return '';
    const targetId = oppId.toString();
    const appRecord = this.volunteerApplications.find(a => {
      const oid = (a.opportunity_id as any)?.id?.toString() || 
                 (a.opportunity_id as any)?._id?.toString() || 
                 a.opportunity_id?.toString();
      return oid === targetId;
    });
    return appRecord ? appRecord.status : '';
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

  acceptPickup(request: WasteRequest) {
    if (this.currentUser) {
      this.wasteService.acceptPickup(request.id, this.currentUser.id, this.currentUser.name).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Failed to accept pickup: ' + (err.error?.message || err.message))
      });
    }
  }

  startPickup(request: WasteRequest) {
    this.wasteService.updateRequest(request.id, { status: 'In Progress' }).subscribe({
        next: () => {
            alert('Status updated to In Progress! Drive safely.');
            this.refreshData();
        },
        error: (err) => alert('Failed to start pickup: ' + (err.error?.message || err.message))
    });
  }

  completeProject(app: Application): void {
    const oppId = (app.opportunity_id as any)?._id || (app.opportunity_id as any)?.id || app.opportunity_id;
    if (!oppId) return;

    if (confirm('Are you sure you want to mark this project as COMPLETED?')) {
      this.opportunityService.completeOpportunity(oppId).subscribe({
        next: () => {
          alert('Project marked as completed! Great job.');
          this.refreshData();
        },
        error: (err: any) => alert('Failed to complete project: ' + (err.error?.message || err.message))
      });
    }
  }

  getCategoryIcon(cat: string | string[] | undefined | null): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (!cat) return '📦';
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }

  formatCategories(cat: string | string[] | undefined | null): string {
      if (!cat) return 'General Waste';
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
  }
}
