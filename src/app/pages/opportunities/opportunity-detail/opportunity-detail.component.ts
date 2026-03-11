import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OpportunityService } from '../../../services/opportunity.service';
import { ApplicationService } from '../../../services/application.service';
import { AuthService, User } from '../../../services/auth.service';
import { Opportunity } from '../../../models/opportunity.model';

@Component({
  selector: 'app-opportunity-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './opportunity-detail.component.html',
  styleUrls: ['./opportunity-detail.component.css']
})
export class OpportunityDetailComponent implements OnInit {
  opportunity: Opportunity | undefined;
  currentUser: User | null = null;
  isAdmin = false;
  isVolunteer = false;
  isNGO = false;
  sidebarOpen = true;

  hasApplied = false;
  applicationStatus = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private opportunityService: OpportunityService,
    private applicationService: ApplicationService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.isVolunteer = user?.role === 'Volunteer';
      this.isNGO = user?.role === 'NGO';
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.opportunityService.getOpportunityById(id).subscribe({
        next: (opp) => {
          this.opportunity = opp;
          this.checkApplicationStatus(id);
        },
        error: (err) => console.log('Error fetching opportunity:', err)
      });
    }
  }

  checkApplicationStatus(oppId: string) {
    if (this.isVolunteer) {
      this.applicationService.getVolunteerApplications().subscribe({
        next: (apps) => {
          const application = apps.find(a => {
            const aId = a.opportunity_id?._id || a.opportunity_id;
            return aId === oppId;
          });
          if (application) {
            this.hasApplied = true;
            this.applicationStatus = application.status;
          }
        }
      });
    }
  }

  applyForOpportunity() {
    if (!this.opportunity || !this.isVolunteer) return;
    const oppId = this.opportunity._id || this.opportunity.id;
    if (!oppId) return;

    this.applicationService.applyForOpportunity(oppId).subscribe({
      next: (app) => {
        this.hasApplied = true;
        this.applicationStatus = app.status;
        alert('Successfully applied for this opportunity!');
      },
      error: (err) => alert(err.error?.message || 'Error applying for opportunity')
    });
  }

  deleteOpportunity() {
    if (this.opportunity) {
      const oppId = this.opportunity._id || this.opportunity.id;
      if (!oppId) return;
      if (!confirm('Are you sure you want to PERMANENTLY delete this opportunity? This action cannot be undone.')) return;
      this.opportunityService.deleteOpportunity(oppId).subscribe(() => {
        this.router.navigate(['/opportunities']);
      });
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getDashboardLink(): string {
    if (this.isAdmin) return '/admin';
    return '/dashboard';
  }
}
