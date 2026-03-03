import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-pickup-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pickup-request.component.html',
  styleUrls: ['./pickup-request.component.css']
})
export class PickupRequestComponent implements OnInit {
  currentUser: User | null = null;
  submitSuccess = false;
  
  newRequest: Partial<WasteRequest> = {
    wasteCategory: 'Plastic',
    description: '',
    location: ''
  };

  categories: WasteRequest['wasteCategory'][] = [
    'Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'
  ];

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.newRequest.location = user.location || '';
      }
    });
  }

  onSubmitPickup() {
    if (!this.currentUser) return;
    if (!this.newRequest.description || !this.newRequest.location) return;

    this.wasteService.createRequest({
      ...this.newRequest,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    });

    this.submitSuccess = true;
    
    // Reset form
    this.newRequest = {
      wasteCategory: 'Plastic',
      description: '',
      location: this.currentUser.location || ''
    };

    setTimeout(() => {
      this.submitSuccess = false;
      this.router.navigate(['/citizen/dashboard']);
    }, 2000);
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }
}
