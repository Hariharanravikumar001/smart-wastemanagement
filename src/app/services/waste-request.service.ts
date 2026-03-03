import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { WasteRequest } from '../models/waste-request.model';

@Injectable({
  providedIn: 'root'
})
export class WasteRequestService {
  private requestsSubject = new BehaviorSubject<WasteRequest[]>([]);
  public requests$ = this.requestsSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    if (typeof localStorage !== 'undefined') {
      const savedRequests = localStorage.getItem('wastezero_pickups');
      if (savedRequests) {
        const parsed = JSON.parse(savedRequests).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : undefined
        }));
        this.requestsSubject.next(parsed);
      } else {
        // Initial mock data
        const mockRequests: WasteRequest[] = [
          {
            id: 'req1',
            citizenId: 'user1',
            citizenName: 'John Doe',
            location: '123 Green St, NY',
            wasteCategory: 'E-Waste',
            description: 'Old laptop and cables',
            status: 'Scheduled',
            createdAt: new Date('2026-10-20'),
            scheduledDate: new Date('2026-10-24'),
            volunteerId: 'vol1',
            volunteerName: 'Agent Smith'
          },
          {
            id: 'req2',
            citizenId: 'user1',
            citizenName: 'John Doe',
            location: '123 Green St, NY',
            wasteCategory: 'Plastic',
            description: 'Water bottles and containers',
            status: 'Completed',
            createdAt: new Date('2026-10-15'),
            weight: 5.2,
            volunteerId: 'vol1',
            volunteerName: 'Agent Smith'
          },
          {
            id: 'req3',
            citizenId: 'user2',
            citizenName: 'Jane Birkin',
            location: '456 Blue Ave, SF',
            wasteCategory: 'Organic',
            description: 'Kitchen waste',
            status: 'Pending',
            createdAt: new Date(),
          }
        ];
        this.saveRequests(mockRequests);
      }
    }
  }

  private saveRequests(requests: WasteRequest[]) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wastezero_pickups', JSON.stringify(requests));
    }
    this.requestsSubject.next(requests);
  }

  getRequestsByCitizen(citizenId: string): Observable<WasteRequest[]> {
    return of(this.requestsSubject.value.filter(r => r.citizenId === citizenId));
  }

  getRequestsByVolunteer(volunteerId: string): Observable<WasteRequest[]> {
    return of(this.requestsSubject.value.filter(r => r.volunteerId === volunteerId));
  }

  getAllRequests(): Observable<WasteRequest[]> {
    return this.requests$;
  }

  getAvailableRequests(): Observable<WasteRequest[]> {
    return of(this.requestsSubject.value.filter(r => r.status === 'Pending'));
  }

  assignVolunteer(requestId: string, volunteerId: string, volunteerName: string): void {
    const current = this.requestsSubject.value;
    const index = current.findIndex(r => r.id === requestId);
    if (index !== -1) {
      current[index] = { 
        ...current[index], 
        volunteerId, 
        volunteerName,
        status: 'Scheduled',
        scheduledDate: new Date() // Default to now if assigned
      };
      this.saveRequests([...current]);
    }
  }

  acceptPickup(requestId: string, volunteerId: string, volunteerName: string): void {
    this.assignVolunteer(requestId, volunteerId, volunteerName);
  }

  createRequest(requestData: Partial<WasteRequest>): void {
    const current = this.requestsSubject.value;
    const newRequest: WasteRequest = {
      id: Math.random().toString(36).substring(2, 11),
      citizenId: requestData.citizenId || '',
      citizenName: requestData.citizenName || '',
      location: requestData.location || '',
      wasteCategory: requestData.wasteCategory || 'Other',
      description: requestData.description || '',
      status: 'Pending',
      createdAt: new Date(),
      ...requestData
    } as WasteRequest;
    
    this.saveRequests([...current, newRequest]);
  }

  updateRequest(id: string, data: Partial<WasteRequest>): void {
    const current = this.requestsSubject.value;
    const index = current.findIndex(r => r.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...data };
      this.saveRequests([...current]);
    }
  }

  updateRequestStatus(id: string, status: WasteRequest['status'], weight?: number): void {
    const current = this.requestsSubject.value;
    const index = current.findIndex(r => r.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], status };
      if (weight !== undefined) {
        current[index].weight = weight;
      }
      this.saveRequests([...current]);
    }
  }
}
