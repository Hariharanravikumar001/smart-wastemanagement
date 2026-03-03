import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { OpportunityService } from '../../../services/opportunity.service';
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
  sidebarOpen = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private opportunityService: OpportunityService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.isVolunteer = user?.role === 'Volunteer';
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.opportunity = this.opportunityService.getOpportunityById(id);
    }
  }

  deleteOpportunity() {
    if (this.opportunity) {
      this.opportunityService.deleteOpportunity(this.opportunity.id);
      this.router.navigate(['/opportunities']);
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
