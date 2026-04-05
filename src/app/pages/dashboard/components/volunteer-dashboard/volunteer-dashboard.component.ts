import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map, combineLatest, catchError, BehaviorSubject, switchMap, timer, shareReplay } from 'rxjs';
import { Opportunity } from '../../../../models/opportunity.model';
import { Application } from '../../../../models/application.model';
import { WasteRequest } from '../../../../models/waste-request.model';
import { User } from '../../../../services/auth.service';
import { MatchingService } from '../../../../services/matching.service';
import { WasteRequestService } from '../../../../services/waste-request.service';
import { ApplicationService } from '../../../../services/application.service';

@Component({
  selector: 'app-volunteer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './volunteer-dashboard.component.html',
  styleUrls: ['./volunteer-dashboard.component.css']
})
export class VolunteerDashboardComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Input() activeTab: string = 'opportunities';
  @Output() setTab = new EventEmitter<string>();

  matchedOpportunities$: Observable<Opportunity[]> = of([]);
  assignments$: Observable<WasteRequest[]> = of([]);
  acceptedNGOProjects$: Observable<Application[]> = of([]);
  myApplications$: Observable<Application[]> = of([]);
  volunteerApplications: Application[] = [];
  
  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private matchingService: MatchingService,
    private wasteService: WasteRequestService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit() {
    if (this.currentUser) {
      // Use switchMap with a refresh trigger to reload all data together
      // Refresh every 30 seconds automatically + manual triggers
      const dataStream = combineLatest([
        timer(0, 300000),
        this.refreshSubject
      ]).pipe(
        map(() => this.currentUser!)
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
        map(apps => apps.filter((a: any) => a.status === 'accepted'))
      );

      this.matchedOpportunities$ = combineLatest([
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
            
            // NOTE: We used to filter out already applied ones entirely.
            // But if it's ACCEPTED, we should probably still show it in the list with "Assigned" status
            // so the volunteer doesn't think it "disappeared".
            return !apps.some((app: any) => {
              const aid = (app.opportunity_id as any)?.id?.toString() || 
                           (app.opportunity_id as any)?._id?.toString() || 
                           (typeof app.opportunity_id === 'string' ? app.opportunity_id : null);
              const isMatch = aid === oppId;
              const isAccepted = isMatch && app.status === 'accepted';
              
              // Only filter OUT if it's NOT accepted (i.e. pending or rejected)
              // This way, Accepted ones STAY in the list but with "Assigned" status (handled in template)
              return isMatch && !isAccepted;
            });
          });
        })
      );

      this.assignments$ = dataStream.pipe(
        switchMap(() => this.wasteService.getRequestsByVolunteer(this.currentUser!.id).pipe(
          catchError(() => of([]))
        ))
      );
    }
  }

  refreshData() {
    this.refreshSubject.next();
  }

  loadVolunteerApplications() {
    this.applicationService.getVolunteerApplications().subscribe({
      next: (apps) => this.volunteerApplications = apps,
      error: (err) => console.error('Failed to load applications:', err)
    });
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

  getCategoryIcon(cat: string | string[] | undefined): string {
    if (!cat) return '📦';
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }

  formatCategories(cat: string | string[] | undefined): string {
      if (!cat) return 'General';
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
  }

  navigateToOpportunities() {
    this.setTab.emit('opportunities');
  }
}
