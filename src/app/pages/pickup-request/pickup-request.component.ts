import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WasteRequestService } from '../../services/waste-request.service';
import { AuthService, User } from '../../services/auth.service';
import { WasteRequest } from '../../models/waste-request.model';

@Component({
  selector: 'app-pickup-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIf],
  templateUrl: './pickup-request.component.html',
  styleUrls: ['./pickup-request.component.css']
})
export class PickupRequestComponent implements OnInit {
  currentUser: User | null = null;
  request: Partial<WasteRequest> = {
    wasteCategory: [],
    description: '',
    location: ''
  };

  categories = ['Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'];

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && user.location) {
        this.request.location = user.location;
      }
    });
  }

  onCategoryToggle(cat: string): void {
    if (!this.request.wasteCategory) {
      this.request.wasteCategory = [];
    }
    
    const index = this.request.wasteCategory.indexOf(cat);
    if (index === -1) {
      this.request.wasteCategory.push(cat);
    } else {
      this.request.wasteCategory.splice(index, 1);
    }
  }

  isCategorySelected(cat: string): boolean {
    return !!this.request.wasteCategory?.includes(cat);
  }

  submitting = false;
  error: string | null = null;
  success = false;

  onSubmit(): void {
    if (!this.currentUser) {
      this.error = 'You must be logged in to submit a request.';
      return;
    }

    if (!this.request.wasteCategory || this.request.wasteCategory.length === 0 || !this.request.description || !this.request.location) {
      this.error = 'Please fill in all required fields and select at least one category.';
      return;
    }

    this.submitting = true;
    this.error = null;

    this.wasteService.createRequest({
      ...this.request,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    }).subscribe({
      next: () => {
        this.success = true;
        this.submitting = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: (err) => {
        console.error('Pickup submission error:', err);
        this.error = 'Failed to submit request. Please try again later.';
        this.submitting = false;
      }
    });
  }
}
