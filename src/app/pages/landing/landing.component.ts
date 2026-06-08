import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OpportunityService } from '../../services/opportunity.service';
import { Opportunity } from '../../models/opportunity.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  featuredOpportunities: Opportunity[] = [];

  // Counter Metrics
  displayUsers = 0;
  displayPickups = 0;
  displayNGOs = 0;
  animationProgress = 0; // Tracks progress from 0 to 1 for color animation

  // Real targets loaded from DB (fallback to defaults)
  targetUsers = 10;
  targetPickups = 50;
  targetNGOs = 10;

  constructor(
    private opportunityService: OpportunityService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.opportunityService.getOpportunities().subscribe({
      next: (res) => {
        const opps = res.opportunities || res;
        this.featuredOpportunities = opps.slice(0, 3);
      },
      error: (err) => {
        console.warn('⚠️ [LANDING] Failed to load opportunities:', err.message);
        this.featuredOpportunities = [];
      }
    });

    // Load live stats from backend
    this.http.get<any>('/api/public/stats').subscribe({
      next: (stats) => {
        this.targetUsers = stats.totalUsers || 10;
        this.targetPickups = stats.completedPickups || 50;
        this.targetNGOs = stats.ngoPartners || 10;
        if (isPlatformBrowser(this.platformId)) {
          this.startCounters();
        }
      },
      error: () => {
        // Fallback to defaults if API fails
        if (isPlatformBrowser(this.platformId)) {
          this.startCounters();
        }
      }
    });
  }

  private startCounters() {
    const duration = 2000; // 2 seconds animation
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      this.animationProgress = easeProgress;

      this.displayUsers = Math.floor(easeProgress * this.targetUsers);
      this.displayPickups = Math.floor(easeProgress * this.targetPickups);
      this.displayNGOs = Math.floor(easeProgress * this.targetNGOs);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }

  getCounterColor(progress: number) {
    // Interpolate between pure white (255, 255, 255) and a punchy Emerald green (34, 197, 94)
    const r = Math.floor(255 + (34 - 255) * progress);
    const g = Math.floor(255 + (197 - 255) * progress);
    const b = Math.floor(255 + (94 - 255) * progress);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
