import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { OpportunityService } from './opportunity.service';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminReportService {
  private apiUrl = '/api/admin';

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private http: HttpClient,
    private authService: AuthService,
    private opportunityService: OpportunityService
  ) { }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('wastezero_token') || '';
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getEngagementAnalytics(range: string = '1week'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics?range=${range}`, { headers: this.getHeaders() });
  }


  getUserStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user-stats`, { headers: this.getHeaders() });
  }

  getOpportunityStats() {
    return this.opportunityService.getOpportunities().pipe(
      map((res: any) => {
        const opportunities = res.opportunities || res;

        const statsByType: { [key: string]: number } = {};

        opportunities.forEach((opp: any) => {
          statsByType[opp.wasteType || 'Other'] = (statsByType[opp.wasteType || 'Other'] || 0) + 1;
        });

        return {
          total: opportunities.length,
          byType: statsByType,
          recent: opportunities.filter((o: any) => {
            if (!o.createdAt) return false;
            const diff = new Date().getTime() - new Date(o.createdAt).getTime();
            return diff < (7 * 24 * 60 * 60 * 1000); // Last 7 days
          }).length
        };
      })
    );
  }

  exportUsersToCSV(): void {
    console.log('Initiating User CSV export...');
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Got users for CSV:', users?.length);
        try {
          const usersArray = Array.isArray(users) ? users : ((users as any).users || []);
          const headers = ['ID', 'Name', 'Username', 'Email', 'Role', 'Location', 'Status'];
          const rows = usersArray.map((u: any) => [
            u.id || u._id || '',
            u.name || '',
            u.username || '',
            u.email || '',
            u.role || '',
            u.location || '',
            u.isSuspended ? 'Suspended' : 'Active'
          ]);

          this.downloadCSV(headers, rows, 'wastezero_users_report.csv');
        } catch (err) {
          console.error('Error processing User export CSV:', err);
        }
      },
      error: (err) => console.error('getAllUsers API error during CSV export:', err)
    });
  }

  exportOpportunitiesToCSV(): void {
    console.log('Initiating Opportunity CSV export...');
    this.opportunityService.getOpportunities().subscribe({
      next: (res: any) => {
        console.log('Got opportunities for CSV. res:', res);
        try {
          const opportunities = Array.isArray(res) ? res : (res.opportunities || []);

          const headers = ['ID', 'Title', 'Waste Type', 'Location', 'Duration', 'Organization', 'Status', 'Applicants', 'Posted Date'];
          const rows = opportunities.map((o: any) => [
            o._id || o.id || '',
            o.title || '',
            o.wasteType || 'Other',
            o.location || '',
            o.duration || '',
            o.organizationName || '',
            o.status || 'Open',
            o.applicantCount || 0,
            o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''
          ]);

          this.downloadCSV(headers, rows, 'wastezero_opportunities_report.csv');
        } catch (err) {
          console.error('Error processing Opportunity export CSV:', err);
        }
      },
      error: (err) => console.error('getOpportunities API error during CSV export:', err)
    });
  }

  exportApplicationsToCSV(): void {
    console.log('Initiating Application CSV export...');
    this.http.get<any>('/api/applications', { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        try {
          const applications = Array.isArray(res) ? res : (res.applications || []);
          const csvHeaders = ['ID', 'Volunteer Name', 'Volunteer Email', 'Opportunity Title', 'Status', 'Applied Date'];
          const rows = applications.map((a: any) => [
            a._id || a.id || '',
            a.volunteer_id?.name || a.volunteerName || '',
            a.volunteer_id?.email || a.volunteerEmail || '',
            a.opportunity_id?.title || a.opportunityTitle || '',
            a.status || 'pending',
            a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''
          ]);
          this.downloadCSV(csvHeaders, rows, 'wastezero_applications_report.csv');
        } catch (err) {
          console.error('Error processing Application export CSV:', err);
        }
      },
      error: (err) => console.error('Applications API error during CSV export:', err)
    });
  }

  private downloadCSV(headers: string[], rows: any[][], filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
          const cellStr = cell === null || cell === undefined ? '' : String(cell);
          return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(','))
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
