import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent {
  services = [
    {
      title: 'Smart Waste Pickup',
      icon: 'bi-truck',
      description: 'Effortless scheduling and tracking of waste collection at your doorstep.',
      details: [
        'On-demand pickup scheduling via mobile or web.',
        'Real-time tracking of collection vehicles.',
        'Digital verification of completed pickups.',
        'Special handling for hazardous materials.'
      ],
      color: '#4CAF50'
    },
    {
      title: 'Intelligent Sorting',
      icon: 'bi-diagram-3',
      description: 'AI-powered waste categorization to maximize recycling efficiency.',
      details: [
        'Automated classification of Plastic, Paper, Glass, and Metal.',
        'Guidance on local recycling regulations.',
        'Contamination detection and alerts.',
        'Optimized routing for specific waste categories.'
      ],
      color: '#2196F3'
    },
    {
      title: 'Volunteer Network',
      icon: 'bi-people',
      description: 'Connecting motivated citizens with NGOs and environmental volunteers.',
      details: [
        'Community cleaning drive organization.',
        'Reward points for active volunteer participation.',
        'Direct communication with local NGOs.',
        'Skill-sharing and environmental workshops.'
      ],
      color: '#FF9800'
    },
    {
      title: 'Impact Analytics',
      icon: 'bi-graph-up-arrow',
      description: 'Data-driven insights into your environmental contribution.',
      details: [
        'Personalized dashboard for waste reduction trends.',
        'Carbon footprint savings calculation.',
        'Community-wide recycling benchmarks.',
        'Exportable reports for sustainability compliance.'
      ],
      color: '#9C27B0'
    }
  ];

  howItWorks = [
    {
      step: '1',
      title: 'Register & Profile',
      description: 'Join the platform and set up your location for seamless service.'
    },
    {
      step: '2',
      title: 'Request Pickup',
      description: 'Choose your waste type and schedule a convenient time slot.'
    },
    {
      step: '3',
      title: 'Process & Sort',
      description: 'Our team uses intelligent sorting to ensure maximum recycling.'
    },
    {
      step: '4',
      title: 'Track Impact',
      description: 'See your contribution reflected in real-time analytics.'
    }
  ];
}
