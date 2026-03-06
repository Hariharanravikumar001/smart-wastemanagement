import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, map } from 'rxjs';
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
  myApplications$: Observable<Application[]> = of([]);

  constructor(
    private matchingService: MatchingService,
    private wasteService: WasteRequestService,
    private applicationService: ApplicationService
  ) { }

  ngOnInit() {
    if (this.currentUser) {
      this.matchedOpportunities$ = this.matchingService.getMatches();
      this.assignments$ = this.wasteService.requests$.pipe(
        map(reqs => reqs.filter(r => r.volunteerId === this.currentUser?.id))
      );
      this.myApplications$ = this.applicationService.getVolunteerApplications();
    }
  }

  getCategoryIcon(cat: string | undefined): string {
    if (!cat) return '📦';
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }

  navigateToOpportunities() {
    this.setTab.emit('opportunities');
  }
}
