import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Opportunity } from '../models/opportunity.model';

@Injectable({
  providedIn: 'root'
})
export class OpportunityService {
  private opportunitiesSubject = new BehaviorSubject<Opportunity[]>([]);
  public opportunities$: Observable<Opportunity[]> = this.opportunitiesSubject.asObservable();
  private readonly STORAGE_KEY = 'wastezero_opportunities';

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        // Hydrate dates properly
        const parsed: Opportunity[] = JSON.parse(stored).map((opp: any) => ({
          ...opp,
          organizationId: opp.organizationId || 'admin1',
          organizationName: opp.organizationName || 'Admin Organization',
          createdAt: opp.createdAt ? new Date(opp.createdAt) : new Date()
        }));
        this.opportunitiesSubject.next(parsed);
      } else {
        // Load mock data if empty
        const mockData: Opportunity[] = [
            {
              id: 'opp1',
              title: 'Beach Cleanup Drive',
              description: 'Join us for a weekend beach cleanup at the North Shore. We will provide all necessary equipment.',
              wasteType: 'Plastic',
              location: 'California, USA',
              skillsRequired: ['Physical Fitness', 'Teamwork'],
              duration: '4 hours',
              organizationId: 'ngo_eco_warriors',
              organizationName: 'Eco Warriors',
              createdAt: new Date()
            },
            {
              id: 'opp2',
              title: 'E-Waste Sorting Workshop',
              description: 'Help us sort through collected electronic waste and categorize it for proper recycling.',
              wasteType: 'E-Waste',
              location: 'London, UK',
              skillsRequired: ['Attention to Detail', 'Basic Electronics Knowledge'],
              duration: '2 hours',
              organizationId: 'ngo_green_tech',
              organizationName: 'Green Tech NGO',
              createdAt: new Date()
            }
        ];
        this.saveOpportunities(mockData);
      }
    }
  }

  private saveOpportunities(opportunities: Opportunity[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(opportunities));
      this.opportunitiesSubject.next(opportunities);
    }
  }

  getOpportunities(): Opportunity[] {
    return this.opportunitiesSubject.value;
  }

  getOpportunityById(id: string): Opportunity | undefined {
    return this.getOpportunities().find(opp => opp.id === id);
  }

  createOpportunity(data: Omit<Opportunity, 'id' | 'createdAt'>): Opportunity {
    const newOpportunity: Opportunity = {
      ...data,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date()
    };
    const current = this.getOpportunities();
    this.saveOpportunities([...current, newOpportunity]);
    return newOpportunity;
  }

  updateOpportunity(id: string, data: Partial<Opportunity>): void {
    const current = this.getOpportunities();
    const index = current.findIndex(opp => opp.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...data };
      this.saveOpportunities([...current]);
    }
  }

  deleteOpportunity(id: string): void {
    const current = this.getOpportunities().filter(opp => opp.id !== id);
    this.saveOpportunities(current);
  }
}
