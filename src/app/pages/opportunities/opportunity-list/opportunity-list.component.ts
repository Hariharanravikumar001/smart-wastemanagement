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
  isNGO = false;
  sidebarOpen = true;
  searchQuery = '';

  constructor(
    private opportunityService: OpportunityService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.isVolunteer = user?.role === 'Volunteer';
      this.isNGO = user?.role === 'NGO';
    });
    this.loadOpportunities();
  }

  loadOpportunities() {
    this.opportunityService.getOpportunities().subscribe({
      next: (res) => {
        this.opportunities = res.opportunities || res;
        this.filteredOpportunities = this.opportunities;
      },
      error: (err) => console.error('Failed to load opportunities:', err)
    });
  }

  filterOpportunities() {
    const q = this.searchQuery.toLowerCase();
    this.filteredOpportunities = this.opportunities.filter(o => {
      const title = o.title ? o.title.toLowerCase() : '';
      const loc = o.location ? o.location.toLowerCase() : '';
      const type = o.wasteType ? o.wasteType.toLowerCase() : '';
      return title.includes(q) || loc.includes(q) || type.includes(q);
    });
  }

  deleteOpportunity(id: string | undefined) {
    if (!id) return;
    if (confirm('Are you sure you want to PERMANENTLY delete this opportunity? This action cannot be undone.')) {
      this.opportunityService.deleteOpportunity(id).subscribe({
        next: () => {
          this.opportunities = this.opportunities.filter(o => (o._id || o.id) !== id);
          this.filterOpportunities();
        },
        error: (err) => alert('Failed to delete opportunity')
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
