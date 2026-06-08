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
    location: '',
    skillsRequired: '',
    duration: '',
    organizationId: '',
    organizationName: '',
    startDate: '',
    startTime: '',
    scheduleType: 'none' as 'none' | 'daily' | 'weekly-2' | 'weekly-3',
    scheduleDays: [] as string[],
    scheduleTime: ''
  };

  wasteTypes = [
    { value: 'Plastic', icon: '🧴' },
    { value: 'Paper', icon: '📄' },
    { value: 'Metal', icon: '🔩' },
    { value: 'E-Waste', icon: '💻' },
    { value: 'Organic', icon: '🌿' },
    { value: 'Glass', icon: '🥃' },
    { value: 'Hazardous', icon: '☢️' },
    { value: 'Other', icon: '📦' }
  ];

  weekDays = [
    { value: 'Monday', short: 'Mon' },
    { value: 'Tuesday', short: 'Tue' },
    { value: 'Wednesday', short: 'Wed' },
    { value: 'Thursday', short: 'Thu' },
    { value: 'Friday', short: 'Fri' },
    { value: 'Saturday', short: 'Sat' },
    { value: 'Sunday', short: 'Sun' }
  ];

  selectedWasteTypes: string[] = [];

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
            location: opp.location,
            skillsRequired: (opp.skills || opp.skillsRequired || []).join(', '),
            duration: opp.duration,
            organizationId: opp.ngo_id?._id || opp.ngo_id || opp.organizationId || '',
            organizationName: opp.organizationName || '',
            startDate: opp.startDate || '',
            startTime: opp.startTime || '',
            scheduleType: (opp.scheduleType as any) || 'none',
            scheduleDays: Array.isArray(opp.scheduleDays) ? opp.scheduleDays : [],
            scheduleTime: opp.scheduleTime || ''
          };
          // Populate selectedWasteTypes from existing wasteType
          const raw = (opp as any).wasteType;
          if (Array.isArray(raw)) this.selectedWasteTypes = raw;
          else if (typeof raw === 'string' && raw) this.selectedWasteTypes = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
          else this.selectedWasteTypes = [];
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

  toggleWasteType(type: string) {
    const idx = this.selectedWasteTypes.indexOf(type);
    if (idx > -1) {
      this.selectedWasteTypes = this.selectedWasteTypes.filter(t => t !== type);
    } else {
      this.selectedWasteTypes = [...this.selectedWasteTypes, type];
    }
  }

  isWasteTypeSelected(type: string): boolean {
    return this.selectedWasteTypes.includes(type);
  }

  toggleScheduleDay(day: string) {
    const max = this.form.scheduleType === 'weekly-2' ? 2 : 3;
    const idx = this.form.scheduleDays.indexOf(day);
    if (idx > -1) {
      this.form.scheduleDays = this.form.scheduleDays.filter(d => d !== day);
    } else if (this.form.scheduleDays.length < max) {
      this.form.scheduleDays = [...this.form.scheduleDays, day];
    } else {
      alert(`Please deselect a day first. You can only select ${max} days.`);
    }
  }

  isScheduleDaySelected(day: string): boolean {
    return this.form.scheduleDays.includes(day);
  }

  onScheduleTypeChange() {
    this.form.scheduleDays = [];
  }

  onSubmit() {
    if (this.isSubmitting) return;

    if (this.selectedWasteTypes.length === 0) {
      alert('Please select at least one waste type.');
      return;
    }

    if (this.form.scheduleType === 'weekly-2' && this.form.scheduleDays.length !== 2) {
      alert('Please select exactly 2 days for the weekly schedule.');
      return;
    }

    if (this.form.scheduleType === 'weekly-3' && this.form.scheduleDays.length !== 3) {
      alert('Please select exactly 3 days for the weekly schedule.');
      return;
    }

    if (this.form.scheduleType !== 'none' && !this.form.scheduleTime) {
      alert('Please specify the work completion time for the cleaning schedule.');
      return;
    }

    const data: any = {
      title: this.form.title,
      description: this.form.description,
      wasteType: this.selectedWasteTypes,
      location: this.form.location,
      skills: this.form.skillsRequired.split(',').map((s: string) => s.trim()).filter(s => s),
      duration: this.form.duration,
      ngo_id: this.form.organizationId,
      organizationName: this.form.organizationName,
      startDate: this.form.startDate,
      startTime: this.form.startTime,
      scheduleType: this.form.scheduleType,
      scheduleDays: this.form.scheduleDays,
      scheduleTime: this.form.scheduleTime
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
