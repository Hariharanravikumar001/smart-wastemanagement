import { Injectable } from '@angular/core';
import { OpportunityService } from './opportunity.service';
import { AuthService } from './auth.service';
import { Opportunity } from '../models/opportunity.model';
import { User } from '../services/auth.service';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatchingService {

  constructor(
    private opportunityService: OpportunityService,
    private authService: AuthService
  ) { }

  getMatches(): Observable<Opportunity[]> {
    return this.opportunityService.opportunities$.pipe(
      map(opportunities => {
        const user = this.authService.currentUserValue;
        if (!user || user.role === 'Admin') return [];

        return opportunities.filter(opp => {
          // Rule 1: Match by Location (Simple string contains for now)
          const locationMatch = user.location && opp.location.toLowerCase().includes(user.location.toLowerCase());
          
          // Rule 2: Match by Waste Types
          const wasteTypeMatch = user.wasteTypes && user.wasteTypes.some(wt => 
            opp.wasteType.toLowerCase() === wt.toLowerCase()
          );

          // Return true if either matches (Higher relevance if both match)
          return locationMatch || wasteTypeMatch;
        }).sort((a, b) => {
          // Sort by "Relevance" (both match first)
          const aBoth = (user.location && a.location.toLowerCase().includes(user.location.toLowerCase())) &&
                        (user.wasteTypes && user.wasteTypes.some(wt => a.wasteType.toLowerCase() === wt.toLowerCase()));
          const bBoth = (user.location && b.location.toLowerCase().includes(user.location.toLowerCase())) &&
                        (user.wasteTypes && user.wasteTypes.some(wt => b.wasteType.toLowerCase() === wt.toLowerCase()));
          
          if (aBoth && !bBoth) return -1;
          if (!aBoth && bBoth) return 1;
          return 0;
        });
      })
    );
  }
}
