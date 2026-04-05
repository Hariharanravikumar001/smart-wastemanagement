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
  isSubmitting = false;

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
  ) { }

  ngOnInit() {
    this.opportunityId = this.route.snapshot.paramMap.get('id');
    if (this.opportunityId) {
      this.isEditMode = true;
      this.opportunityService.getOpportunityById(this.opportunityId).subscribe(opp => {
        if (opp) {
          this.form = {
            title: opp.title,
            description: opp.description,
            wasteType: opp.wasteType || 'Plastic',
            location: opp.location,
            skillsRequired: (opp.skills || opp.skillsRequired || []).join(', '),
            duration: opp.duration,
            organizationId: opp.ngo_id?._id || opp.ngo_id || opp.organizationId || '',
            organizationName: opp.organizationName || ''
          };
        }
      });
    } else {
      const user = this.authService.currentUserValue;
      if (user) {
        this.form.organizationId = user.id;
        this.form.organizationName = user.name;
      }
    }
  }

  onSubmit() {
    if (this.isSubmitting) return;

    const data: any = {
      title: this.form.title,
      description: this.form.description,
      wasteType: this.form.wasteType,
      location: this.form.location,
      skills: this.form.skillsRequired.split(',').map(s => s.trim()).filter(s => s),
      duration: this.form.duration,
      ngo_id: this.form.organizationId,
      organizationName: this.form.organizationName
    };

    this.isSubmitting = true;

    if (this.isEditMode && this.opportunityId) {
      this.opportunityService.updateOpportunity(this.opportunityId, data).subscribe({
        next: () => this.router.navigate(['/opportunities']),
        error: (err) => {
          alert('Error updating opportunity');
          this.isSubmitting = false;
        }
      });
    } else {
      this.opportunityService.createOpportunity(data).subscribe({
        next: () => this.router.navigate(['/opportunities']),
        error: (err) => {
          alert('Error creating opportunity');
          this.isSubmitting = false;
        }
      });
    }
  }
}
