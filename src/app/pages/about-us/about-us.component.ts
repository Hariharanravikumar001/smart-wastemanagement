import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.css'
})
export class AboutUsComponent implements OnInit {
  // Counter Metrics
  displayCities = 0;
  displayAccuracy = 0;
  displayWaste = 0;
  displayUsers = 0;
  displayVolunteers = 0;
  displayPartners = 0;

  // Target Values
  targetCities = 15;
  targetAccuracy = 98;
  targetWaste = 1.2;
  targetUsers = 45;
  targetVolunteers = 12;
  targetPartners = 950;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startCounters();
    }
  }

  private startCounters() {
    const duration = 2500; // 2.5 seconds animation
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);

      this.displayCities = Math.floor(easeProgress * this.targetCities);
      this.displayAccuracy = Math.floor(easeProgress * this.targetAccuracy);
      this.displayWaste = Number((easeProgress * this.targetWaste).toFixed(1));
      this.displayUsers = Math.floor(easeProgress * this.targetUsers);
      this.displayVolunteers = Math.floor(easeProgress * this.targetVolunteers);
      this.displayPartners = Math.floor(easeProgress * this.targetPartners);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Restart after 3 seconds for "again and again" looping
        setTimeout(() => this.startCounters(), 3000);
      }
    };

    requestAnimationFrame(update);
  }
}
