import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { WasteRequestService } from '../../services/waste-request.service';
import { AuthService, User } from '../../services/auth.service';
import { WasteRequest } from '../../models/waste-request.model';

@Component({
  selector: 'app-pickup-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pickup-request.component.html',
  styleUrls: ['./pickup-request.component.css']
})
export class PickupRequestComponent implements OnInit {
  currentUser: User | null = null;
  request: Partial<WasteRequest> = {
    wasteCategory: 'Plastic',
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

  onSubmit(): void {
    if (this.currentUser && this.request.wasteCategory && this.request.description) {
      this.wasteService.createRequest({
        ...this.request,
        citizenId: this.currentUser.id,
        citizenName: this.currentUser.name
      }).subscribe(() => {
        this.router.navigate(['/dashboard']);
      });
    }
  }
}
