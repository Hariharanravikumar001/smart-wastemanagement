import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Opportunity } from '../models/opportunity.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OpportunityService {
  private apiUrl = 'http://localhost:5000/api/opportunities';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    let token = '';
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('wastezero_token') || '';
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getOpportunities(filters?: { location?: string, skill?: string, page?: number, limit?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.location) params = params.set('location', filters.location);
      if (filters.skill) params = params.set('skill', filters.skill);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders(), params }).pipe(
      map((res: any) => {

        let data = res.opportunities || res;
        data = data.map((o: any) => ({
          ...o,
          id: o._id || o.id,
          organizationId: o.ngo_id?._id || o.organizationId || o.ngo_id,
          organizationName: o.ngo_id?.name || o.organizationName || 'Unknown NGO',
          skillsRequired: o.skills || o.skillsRequired || [],
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(o.updatedAt || Date.now())
        }));
        if (res.opportunities) {
          res.opportunities = data;
          return res;
        }
        return data;
      })
    );
  }

  getOpportunityById(id: string): Observable<Opportunity> {
    return this.http.get<Opportunity>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createOpportunity(data: Partial<Opportunity>): Observable<Opportunity> {
    return this.http.post<Opportunity>(this.apiUrl, data, { headers: this.getHeaders() });
  }

  updateOpportunity(id: string, data: Partial<Opportunity>): Observable<Opportunity> {
    return this.http.put<Opportunity>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  deleteOpportunity(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
