import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WasteRequest } from '../models/waste-request.model';

@Injectable({
  providedIn: 'root'
})
export class WasteRequestService {
  private apiUrl = 'http://localhost:5000/api/waste-requests';

  // We keep the subject if any components bind to it directly with async pipe
  private requestsSubject = new BehaviorSubject<WasteRequest[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Optionally fetch all requests on init
    this.refreshAllRequests();
  }

  // Helper to update the BehaviorSubject
  private refreshAllRequests() {
    this.http.get<WasteRequest[]>(this.apiUrl).subscribe({
      next: (data) => this.requestsSubject.next(data),
      error: (err) => console.error('Error fetching global requests', err)
    });
  }

  getRequestsByCitizen(citizenId: string): Observable<WasteRequest[]> {
    return this.http.get<WasteRequest[]>(`${this.apiUrl}/citizen/${citizenId}`);
  }

  getRequestsByVolunteer(volunteerId: string): Observable<WasteRequest[]> {
    return this.http.get<WasteRequest[]>(`${this.apiUrl}/volunteer/${volunteerId}`);
  }

  getAllRequests(): Observable<WasteRequest[]> {
    return this.http.get<WasteRequest[]>(this.apiUrl).pipe(
      tap(data => this.requestsSubject.next(data))
    );
  }

  getAvailableRequests(): Observable<WasteRequest[]> {
    return this.http.get<WasteRequest[]>(`${this.apiUrl}/available`);
  }

  assignVolunteer(requestId: string, volunteerId: string, volunteerName: string): Observable<WasteRequest> {
    const updateData = {
      volunteerId,
      volunteerName,
      status: 'Scheduled',
      scheduledDate: new Date()
    };
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${requestId}/status`, updateData).pipe(
      tap(() => this.refreshAllRequests())
    );
  }

  acceptPickup(requestId: string, volunteerId: string, volunteerName: string): Observable<WasteRequest> {
    return this.assignVolunteer(requestId, volunteerId, volunteerName);
  }

  createRequest(requestData: Partial<WasteRequest>): Observable<WasteRequest> {
    return this.http.post<WasteRequest>(this.apiUrl, requestData).pipe(
      tap(() => this.refreshAllRequests())
    );
  }

  updateRequest(id: string, data: Partial<WasteRequest>): Observable<WasteRequest> {
    // We didn't add a specific full-update route, but patch /status covers anything sent
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${id}/status`, data).pipe(
      tap(() => this.refreshAllRequests())
    );
  }

  updateRequestStatus(id: string, status: WasteRequest['status'], weight?: number): Observable<WasteRequest> {
    const data: any = { status };
    if (weight !== undefined) {
      data.weight = weight;
    }
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${id}/status`, data).pipe(
      tap(() => this.refreshAllRequests())
    );
  }
}
