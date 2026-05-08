import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OpportunityService } from '../../services/opportunity.service';
import { Opportunity } from '../../models/opportunity.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  targetUsers = 10; // Target is 10k
  targetPickups = 50; // Target is 50k
  targetNGOs = 100; // Target is 100+

  constructor(private opportunityService: OpportunityService) { }

  ngOnInit(): void {
    this.opportunityService.getOpportunities().subscribe(res => {
      const opps = res.opportunities || res;
      this.featuredOpportunities = opps.slice(0, 3);
    });

    this.startCounters();
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
      } else {
        // Restart after 3 seconds for "again and again" looping
        setTimeout(() => {
          this.animationProgress = 0;
          this.startCounters();
        }, 3000);
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
