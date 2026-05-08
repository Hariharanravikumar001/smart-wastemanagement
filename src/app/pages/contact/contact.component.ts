import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {
  contactData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitted = false;
  isSending = false;

  onSubmit() {
    this.isSending = true;
    
    // Simulate API call
    setTimeout(() => {
      console.log('Contact form submitted:', this.contactData);
      this.isSending = false;
      this.isSubmitted = true;
      
      // Reset form after success
      this.contactData = {
        name: '',
        email: '',
        subject: '',
        message: ''
      };

      // Clear success message after 5 seconds
      setTimeout(() => {
        this.isSubmitted = false;
      }, 5000);
    }, 1500);
  }

  contactInfo = [
    {
      icon: 'bi-geo-alt',
      title: 'Our Location',
      details: '123 Smart City Avenue, Eco District, NY 10001',
      color: '#4CAF50'
    },
    {
      icon: 'bi-envelope',
      title: 'Email Us',
      details: 'hariharannamakkal2025@gmail.com',
      color: '#2196F3'
    },
    {
      icon: 'bi-telephone',
      title: 'Call Us',
      details: '+1 (555) 123-4567',
      color: '#FF9800'
    }
  ];
}
