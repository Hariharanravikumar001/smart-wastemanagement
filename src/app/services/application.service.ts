import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models/application.model';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {
    private apiUrl = 'http://localhost:5000/api/applications';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        let token = '';
        if (typeof localStorage !== 'undefined') {
            token = localStorage.getItem('wastezero_token') || '';
        }
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }

    applyForOpportunity(opportunity_id: string): Observable<Application> {
        return this.http.post<Application>(this.apiUrl, { opportunity_id }, { headers: this.getHeaders() });
    }

    getAdminApplications(): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.apiUrl}/admin`, { headers: this.getHeaders() });
    }

    getVolunteerApplications(): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.apiUrl}/volunteer`, { headers: this.getHeaders() });
    }

    updateApplicationStatus(id: string, status: 'accepted' | 'rejected'): Observable<Application> {
        return this.http.put<Application>(`${this.apiUrl}/${id}/status`, { status }, { headers: this.getHeaders() });
    }
}
