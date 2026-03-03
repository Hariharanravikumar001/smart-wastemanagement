import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OpportunityService } from '../../../services/opportunity.service';
import { AuthService, User } from '../../../services/auth.service';
import { Opportunity } from '../../../models/opportunity.model';

@Component({
  selector: 'app-opportunity-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './opportunity-list.component.html',
  styleUrls: ['./opportunity-list.component.css']
})
export class OpportunityListComponent implements OnInit {
  opportunities: Opportunity[] = [];
  filteredOpportunities: Opportunity[] = [];
  currentUser: User | null = null;
  isAdmin = false;
  isVolunteer = false;
  sidebarOpen = true;
  searchQuery = '';

  constructor(
    private opportunityService: OpportunityService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.isVolunteer = user?.role === 'Volunteer';
    });
    this.opportunityService.opportunities$.subscribe(opps => {
      this.opportunities = opps;
      this.filteredOpportunities = opps;
    });
  }

  filterOpportunities() {
    const q = this.searchQuery.toLowerCase();
    this.filteredOpportunities = this.opportunities.filter(o =>
      o.title.toLowerCase().includes(q) || o.location.toLowerCase().includes(q) || o.wasteType.toLowerCase().includes(q)
    );
  }

  deleteOpportunity(id: string) {
    this.opportunityService.deleteOpportunity(id);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  getDashboardLink(): string {
    if (this.isAdmin) return '/admin';
    return '/dashboard';
  }
}
