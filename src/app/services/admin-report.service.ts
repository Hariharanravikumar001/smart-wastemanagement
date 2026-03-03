import { Injectable } from '@angular/core';
import { AuthService, User } from './auth.service';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from '../models/opportunity.model';

@Injectable({
  providedIn: 'root'
})
export class AdminReportService {

  constructor(
    private authService: AuthService,
    private opportunityService: OpportunityService
  ) { }

  getUserStats() {
    const users = this.authService.getAllUsers();
    return {
      total: users.length,
      volunteers: users.filter(u => u.role === 'Volunteer').length,
      regularUsers: users.filter(u => u.role === 'User').length,
      admins: users.filter(u => u.role === 'Admin').length,
      suspended: users.filter(u => u.suspended).length
    };
  }

  getOpportunityStats() {
    const opportunities = this.opportunityService.getOpportunities();
    const statsByType: { [key: string]: number } = {};
    
    opportunities.forEach(opp => {
      statsByType[opp.wasteType] = (statsByType[opp.wasteType] || 0) + 1;
    });

    return {
      total: opportunities.length,
      byType: statsByType,
      recent: opportunities.filter(o => {
        const diff = new Date().getTime() - new Date(o.createdAt).getTime();
        return diff < (7 * 24 * 60 * 60 * 1000); // Last 7 days
      }).length
    };
  }

  exportUsersToCSV(): void {
    const users = this.authService.getAllUsers();
    const headers = ['ID', 'Name', 'Username', 'Email', 'Role', 'Location', 'Status'];
    const rows = users.map(u => [
      u.id, 
      u.name, 
      u.username, 
      u.email, 
      u.role, 
      u.location || '', 
      u.suspended ? 'Suspended' : 'Active'
    ]);
    
    this.downloadCSV(headers, rows, 'wastezero_users_report.csv');
  }

  exportOpportunitiesToCSV(): void {
    const opportunities = this.opportunityService.getOpportunities();
    const headers = ['ID', 'Title', 'Waste Type', 'Location', 'Duration', 'Organization', 'Posted Date'];
    const rows = opportunities.map(o => [
      o.id,
      o.title,
      o.wasteType,
      o.location,
      o.duration,
      o.organizationName,
      o.createdAt.toLocaleDateString()
    ]);

    this.downloadCSV(headers, rows, 'wastezero_opportunities_report.csv');
  }

  private downloadCSV(headers: string[], rows: any[][], filename: string): void {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
