import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-pickup-request',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './pickup-request.component.html',
  styleUrls: ['./pickup-request.component.css']
})
export class PickupRequestComponent implements OnInit {
  currentUser: User | null = null;
  submitSuccess = false;
  
  newRequest: any = {
    wasteCategory: [],
    description: '',
    location: '',
    estimatedWeight: 0,
    pickupDate: new Date().toISOString().split('T')[0]
  };

  categories: string[] = [
    'Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'
  ];

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.newRequest.location = user.location || '';
      }
    });
  }

  submitting = false;
  errorMessage: string | null = null;
  isAnalyzing = false;

  hasAiPrediction(): boolean {
    return !!(this.newRequest as any).imageUrl && !!(this.newRequest as any).aiPredictedCategory;
  }

  clearAiPrediction() {
    (this.newRequest as any).imageUrl = undefined;
    (this.newRequest as any).aiPredictedCategory = undefined;
    // Wipe category array
    this.newRequest.wasteCategory = [];
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isAnalyzing = true;
      this.clearAiPrediction();
      
      // Simulate ML Classification delay
      setTimeout(() => {
        const mockCategories = ['E-Waste', 'Organic', 'Plastic', 'Metal', 'Paper', 'Glass'];
        const randomCat = mockCategories[Math.floor(Math.random() * mockCategories.length)];
        
        (this.newRequest as any).aiPredictedCategory = randomCat;
        this.newRequest.wasteCategory = [randomCat]; // Auto-select it in generic logic
        this.isAnalyzing = false;
        
        // Base64 mapping for quick mockup rendering
        const reader = new FileReader();
        reader.onload = (e: any) => {
           (this.newRequest as any).imageUrl = e.target.result;
           this.newRequest = { ...this.newRequest }; // trigger standard view bindings
           this.cdr.detectChanges(); // force view refresh
        };
        reader.readAsDataURL(file);
      }, 2500);
    }
  }

  onSubmitPickup() {
    if (!this.currentUser) return;
    if (!this.newRequest.description || !this.newRequest.location) {
      this.errorMessage = 'Please provide a description and location.';
      return;
    }

    if (!this.newRequest.wasteCategory || this.newRequest.wasteCategory.length === 0) {
      this.errorMessage = 'Please select at least one waste category.';
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    this.wasteService.createRequest({
      ...this.newRequest,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.submitting = false;
        
        // Reset form
        this.newRequest = {
          wasteCategory: [],
          description: '',
          location: this.currentUser?.location || '',
          estimatedWeight: 0,
          pickupDate: new Date().toISOString().split('T')[0]
        };

        setTimeout(() => {
          this.submitSuccess = false;
          this.router.navigate(['/citizen/dashboard']);
        }, 2000);
      },
      error: (err) => {
        console.error('Citizen pickup error:', err);
        this.errorMessage = err.error?.message || 'Submission failed. Please try again.';
        this.submitting = false;
      }
    });
  }

  onCategoryToggle(category: string) {
    const current = (this.newRequest.wasteCategory as string[]) || [];
    if (current.includes(category)) {
      this.newRequest.wasteCategory = current.filter(c => c !== category);
    } else {
      this.newRequest.wasteCategory = [...current, category];
    }
  }

  getCategoryIcon(cat: string | string[]): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }
}
