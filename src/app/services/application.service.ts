import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, throwError } from 'rxjs';
import { Application } from '../models/application.model';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {
    private apiUrl = '/api/applications';

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        private http: HttpClient
    ) { }

    private getHeaders(): HttpHeaders {
        let token = '';
        if (isPlatformBrowser(this.platformId)) {
            token = localStorage.getItem('wastezero_token') || '';
        }
        return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }

    applyForOpportunity(opportunity_id: string): Observable<Application> {
        return this.http.post<Application>(this.apiUrl, { opportunity_id }, { headers: this.getHeaders() }).pipe(
            catchError(err => {
                if (err.status === 0) {
                    console.error('Connection refuse: Please ensure your backend server is running on port 5000.');
                }
                return throwError(() => err);
            })
        );
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
