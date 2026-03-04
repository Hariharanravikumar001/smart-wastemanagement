import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, map } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-my-pickups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-pickups.component.html',
  styleUrls: ['./my-pickups.component.css']
})
export class MyPickupsComponent implements OnInit {
  currentUser: User | null = null;
  activePickups$: Observable<WasteRequest[]> = new Observable();
  completedPickups$: Observable<WasteRequest[]> = new Observable();
  
  // For weighted completion
  weightInput: number = 0;
  completingRequestId: string | null = null;

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const myRequests$ = this.wasteService.requests$.pipe(
          map(reqs => reqs.filter(r => r.volunteerId === user.id))
        );

        this.activePickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );

        this.completedPickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed'))
        );
      }
    });
  }

  updateStatus(requestId: string, status: WasteRequest['status']) {
    this.wasteService.updateRequest(requestId, { status }).subscribe();
  }

  startCompletion(requestId: string) {
    this.completingRequestId = requestId;
    this.weightInput = 0;
  }

  cancelCompletion() {
    this.completingRequestId = null;
  }

  completePickup() {
    if (this.completingRequestId && this.weightInput > 0) {
      this.wasteService.updateRequest(this.completingRequestId, {
        status: 'Completed',
        weight: this.weightInput
      }).subscribe();
      this.completingRequestId = null;
    }
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }
}
