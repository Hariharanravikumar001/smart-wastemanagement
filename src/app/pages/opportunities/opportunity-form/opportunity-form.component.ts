import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { OpportunityService } from '../../../services/opportunity.service';
import { AuthService } from '../../../services/auth.service';
import { Opportunity } from '../../../models/opportunity.model';

@Component({
  selector: 'app-opportunity-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './opportunity-form.component.html',
  styleUrls: ['./opportunity-form.component.css']
})
export class OpportunityFormComponent implements OnInit {
  isEditMode = false;
  opportunityId: string | null = null;

  form = {
    title: '',
    description: '',
    wasteType: 'Plastic',
    location: '',
    skillsRequired: '',
    duration: '',
    organizationId: '',
    organizationName: ''
  };

  wasteTypes = ['Plastic', 'E-Waste', 'Organic', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'];

  constructor(
    private opportunityService: OpportunityService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.opportunityId = this.route.snapshot.paramMap.get('id');
    if (this.opportunityId) {
      this.isEditMode = true;
      const opp = this.opportunityService.getOpportunityById(this.opportunityId);
      if (opp) {
        this.form = {
          title: opp.title,
          description: opp.description,
          wasteType: opp.wasteType,
          location: opp.location,
          skillsRequired: opp.skillsRequired.join(', '),
          duration: opp.duration,
          organizationId: opp.organizationId,
          organizationName: opp.organizationName
        };
      }
    } else {
      const user = this.authService.currentUserValue;
      if (user) {
        this.form.organizationId = user.id;
        this.form.organizationName = user.name;
      }
    }
  }

  onSubmit() {
    const data: Omit<Opportunity, 'id' | 'createdAt'> = {
      title: this.form.title,
      description: this.form.description,
      wasteType: this.form.wasteType,
      location: this.form.location,
      skillsRequired: this.form.skillsRequired.split(',').map(s => s.trim()).filter(s => s),
      duration: this.form.duration,
      organizationId: this.form.organizationId,
      organizationName: this.form.organizationName
    };

    if (this.isEditMode && this.opportunityId) {
      this.opportunityService.updateOpportunity(this.opportunityId, data);
    } else {
      this.opportunityService.createOpportunity(data);
    }
    this.router.navigate(['/opportunities']);
  }
}
