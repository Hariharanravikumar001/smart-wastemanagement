import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { WasteRequest } from '../models/waste-request.model';

@Injectable({
  providedIn: 'root'
})
export class WasteRequestService {
  private apiUrl = '/api/waste-requests';

  // We keep the subject if any components bind to it directly with async pipe
  private requestsSubject = new BehaviorSubject<WasteRequest[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor(private http: HttpClient) {
    // NOTE: Do NOT auto-fetch on init — components call specific methods after login
  }

  // Helper to update the BehaviorSubject
  private refreshAllRequests() {
    this.http.get<any[]>(this.apiUrl).pipe(
      map(data => data.map(r => ({ ...r, id: r._id || r.id })))
    ).subscribe({
      next: (data) => this.requestsSubject.next(data as WasteRequest[]),
      error: (err) => {
        if (err.status === 0) {
          console.error('Connection refuse: Please ensure your backend server is running on port 5000.');
        } else {
          console.error('Error fetching global requests', err);
        }
      }
    });
  }

  getRequestsByCitizen(citizenId: string): Observable<WasteRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citizen/${citizenId}`).pipe(
      map(data => data.map(r => ({ ...r, id: r._id || r.id })) as WasteRequest[])
    );
  }

  getRequestsByVolunteer(volunteerId: string): Observable<WasteRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/volunteer/${volunteerId}`).pipe(
      map(data => data.map(r => ({ ...r, id: r._id || r.id })) as WasteRequest[])
    );
  }

  getAllRequests(): Observable<WasteRequest[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(data => data.map(r => ({ ...r, id: r._id || r.id })) as WasteRequest[]),
      tap(data => this.requestsSubject.next(data))
    );
  }

  getAvailableRequests(): Observable<WasteRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available`).pipe(
      map(data => data.map(r => ({ ...r, id: r._id || r.id })) as WasteRequest[])
    );
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
      tap(newReq => {
        const current = this.requestsSubject.value;
        this.requestsSubject.next([newReq, ...current].slice(0, 50));
      })
    );
  }

  updateRequest(id: string, data: Partial<WasteRequest>): Observable<WasteRequest> {
    // We didn't add a specific full-update route, but patch /status covers anything sent
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${id}/status`, data).pipe(
      tap(updated => {
        const current = this.requestsSubject.value;
        this.requestsSubject.next(current.map(r => r.id === id ? updated : r));
      })
    );
  }

  updateRequestStatus(id: string, status: WasteRequest['status'], weight?: number): Observable<WasteRequest> {
    const data: any = { status };
    if (weight !== undefined) {
      data.weight = weight;
    }
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${id}/status`, data).pipe(
      tap(updated => {
        const current = this.requestsSubject.value;
        this.requestsSubject.next(current.map(r => r.id === id ? updated : r));
      })
    );
  }

  detectWasteAI(imageBase64: string): Observable<{ message: string, category: string, confidence: number }> {
    return this.http.post<any>('/api/ai/detect-waste', { image: imageBase64 });
  }

  verifyQrCode(requestId: string, qrCodeToken: string): Observable<WasteRequest> {
    return this.http.post<any>(`${this.apiUrl}/${requestId}/verify-qr`, { qrCodeToken }).pipe(
      map(res => res.request),
      tap(updated => {
        const current = this.requestsSubject.value;
        this.requestsSubject.next(current.map(r => r.id === requestId ? updated : r));
      })
    );
  }

  rescheduleRequest(requestId: string, scheduledDate: string, scheduledTime: string): Observable<WasteRequest> {
    return this.http.patch<WasteRequest>(`${this.apiUrl}/${requestId}/reschedule`, { scheduledDate, scheduledTime }).pipe(
      tap(updated => {
        const current = this.requestsSubject.value;
        this.requestsSubject.next(current.map(r => r.id === requestId ? updated : r));
      })
    );
  }
}
