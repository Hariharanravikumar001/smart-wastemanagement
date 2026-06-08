import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent {
  services = [
    {
      title: 'SERVICES.SERVICE_PICKUP_TITLE',
      icon: 'bi-truck',
      description: 'SERVICES.SERVICE_PICKUP_DESC',
      details: [
        'SERVICES.SERVICE_PICKUP_D1',
        'SERVICES.SERVICE_PICKUP_D2',
        'SERVICES.SERVICE_PICKUP_D3',
        'SERVICES.SERVICE_PICKUP_D4'
      ],
      color: '#4CAF50'
    },
    {
      title: 'SERVICES.SERVICE_SORTING_TITLE',
      icon: 'bi-diagram-3',
      description: 'SERVICES.SERVICE_SORTING_DESC',
      details: [
        'SERVICES.SERVICE_SORTING_D1',
        'SERVICES.SERVICE_SORTING_D2',
        'SERVICES.SERVICE_SORTING_D3',
        'SERVICES.SERVICE_SORTING_D4'
      ],
      color: '#2196F3'
    },
    {
      title: 'SERVICES.SERVICE_VOLUNTEER_TITLE',
      icon: 'bi-people',
      description: 'SERVICES.SERVICE_VOLUNTEER_DESC',
      details: [
        'SERVICES.SERVICE_VOLUNTEER_D1',
        'SERVICES.SERVICE_VOLUNTEER_D2',
        'SERVICES.SERVICE_VOLUNTEER_D3',
        'SERVICES.SERVICE_VOLUNTEER_D4'
      ],
      color: '#FF9800'
    },
    {
      title: 'SERVICES.SERVICE_ANALYTICS_TITLE',
      icon: 'bi-graph-up-arrow',
      description: 'SERVICES.SERVICE_ANALYTICS_DESC',
      details: [
        'SERVICES.SERVICE_ANALYTICS_D1',
        'SERVICES.SERVICE_ANALYTICS_D2',
        'SERVICES.SERVICE_ANALYTICS_D3',
        'SERVICES.SERVICE_ANALYTICS_D4'
      ],
      color: '#9C27B0'
    }
  ];

  howItWorks = [
    {
      step: '1',
      title: 'SERVICES.STEP1_TITLE',
      description: 'SERVICES.STEP1_DESC'
    },
    {
      step: '2',
      title: 'SERVICES.STEP2_TITLE',
      description: 'SERVICES.STEP2_DESC'
    },
    {
      step: '3',
      title: 'SERVICES.STEP3_TITLE',
      description: 'SERVICES.STEP3_DESC'
    },
    {
      step: '4',
      title: 'SERVICES.STEP4_TITLE',
      description: 'SERVICES.STEP4_DESC'
    }
  ];
}
