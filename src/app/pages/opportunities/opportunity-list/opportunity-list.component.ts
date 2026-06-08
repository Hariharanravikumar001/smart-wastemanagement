import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OpportunityService } from '../../../services/opportunity.service';
import { AuthService, User } from '../../../services/auth.service';
import { SearchService } from '../../../services/search.service';
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

  // Local filter fields
  localSearchQuery = '';
  filterCategory = '';
  filterLocation = '';

  constructor(
    private opportunityService: OpportunityService,
    private authService: AuthService,
    private searchService: SearchService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'Admin';
      this.isVolunteer = user?.role === 'Volunteer';
      this.isNGO = user?.role === 'NGO';
    });

    this.searchService.searchTerm$.subscribe(term => {
      this.searchQuery = term;
      this.applyLocalFilters();
    });

    this.loadOpportunities();
  }

  loadOpportunities() {
    this.opportunityService.getOpportunities().subscribe({
      next: (res) => {
        this.opportunities = res.opportunities || res;
        this.applyLocalFilters();
      },
      error: (err) => console.error('Failed to load opportunities:', err)
    });
  }

  applyLocalFilters() {
    let results = [...this.opportunities];

    // Apply global search term from search service
    const globalQ = this.searchQuery.toLowerCase();
    if (globalQ) {
      results = results.filter(o => {
        const title = o.title ? o.title.toLowerCase() : '';
        const loc = o.location ? o.location.toLowerCase() : '';
        const typeRaw = o.wasteType;
        const type = Array.isArray(typeRaw) ? typeRaw.join(' ').toLowerCase() : (typeRaw ? typeRaw.toLowerCase() : '');
        return title.includes(globalQ) || loc.includes(globalQ) || type.includes(globalQ);
      });
    }

    // Apply local search query
    const localQ = this.localSearchQuery.toLowerCase().trim();
    if (localQ) {
      results = results.filter(o => {
        const title = o.title ? o.title.toLowerCase() : '';
        const loc = o.location ? o.location.toLowerCase() : '';
        const typeRaw = o.wasteType;
        const type = Array.isArray(typeRaw) ? typeRaw.join(' ').toLowerCase() : (typeRaw ? typeRaw.toLowerCase() : '');
        const desc = o.description ? o.description.toLowerCase() : '';
        return title.includes(localQ) || loc.includes(localQ) || type.includes(localQ) || desc.includes(localQ);
      });
    }

    // Apply category filter
    if (this.filterCategory) {
      results = results.filter(o => {
        const wt = o.wasteType;
        if (Array.isArray(wt)) return wt.includes(this.filterCategory);
        return wt === this.filterCategory;
      });
    }

    // Apply location filter
    const locQ = this.filterLocation.toLowerCase().trim();
    if (locQ) {
      results = results.filter(o => o.location && o.location.toLowerCase().includes(locQ));
    }

    this.filteredOpportunities = results;
  }

  // Keep backward compat alias
  filterOpportunities() {
    this.applyLocalFilters();
  }

  clearFilters() {
    this.localSearchQuery = '';
    this.filterCategory = '';
    this.filterLocation = '';
    this.applyLocalFilters();
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
