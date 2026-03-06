import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OpportunityService } from '../../services/opportunity.service';
import { Opportunity } from '../../models/opportunity.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  featuredOpportunities: Opportunity[] = [];

  constructor(private opportunityService: OpportunityService) { }

  ngOnInit(): void {
    this.opportunityService.getOpportunities().subscribe(res => {
      const opps = res.opportunities || res;
      this.featuredOpportunities = opps.slice(0, 3);
    });
  }
}
