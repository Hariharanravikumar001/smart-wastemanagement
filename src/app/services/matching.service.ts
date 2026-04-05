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
    return this.opportunityService.getMatchedOpportunities();
  }
}
