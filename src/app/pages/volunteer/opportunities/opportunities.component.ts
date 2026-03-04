import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './opportunities.component.html',
  styleUrls: ['./opportunities.component.css']
})
export class OpportunitiesComponent implements OnInit {
  currentUser: User | null = null;
  opportunities$: Observable<WasteRequest[]> = new Observable();

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.opportunities$ = this.wasteService.requests$.pipe(
      map(reqs => reqs.filter(r => r.status === 'Pending'))
    );
  }

  acceptPickup(request: WasteRequest) {
    if (!this.currentUser) return;
    
    this.wasteService.updateRequest(request.id, {
      status: 'Scheduled',
      volunteerId: this.currentUser.id,
      volunteerName: this.currentUser.name,
      scheduledDate: new Date()
    }).subscribe();
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    return icons[cat] || '📦';
  }
}
