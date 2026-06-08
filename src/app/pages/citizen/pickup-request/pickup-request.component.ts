import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

@Component({
  selector: 'app-pickup-request',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './pickup-request.component.html',
  styleUrls: ['./pickup-request.component.css']
})
export class PickupRequestComponent implements OnInit {
  currentUser: User | null = null;
  submitSuccess = false;
  
  newRequest: any = {
    wasteCategory: [],
    description: '',
    location: '',
    estimatedWeight: 0,
    pickupDate: new Date().toISOString().split('T')[0],
    pickupTime: '10:00'
  };

  categories: string[] = [
    'Plastic', 'Organic', 'E-Waste', 'Metal', 'Glass', 'Paper', 'Hazardous', 'Other'
  ];

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.newRequest.location = user.location || '';
      }
    });
  }

  submitting = false;
  errorMessage: string | null = null;
  isAnalyzing = false;

  hasAiPrediction(): boolean {
    return !!(this.newRequest as any).imageUrl && !!(this.newRequest as any).aiPredictedCategory;
  }

  clearAiPrediction() {
    (this.newRequest as any).imageUrl = undefined;
    (this.newRequest as any).aiPredictedCategory = undefined;
    // Wipe category array
    this.newRequest.wasteCategory = [];
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isAnalyzing = true;
      this.clearAiPrediction();
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
         const imageBase64 = e.target.result;
         (this.newRequest as any).imageUrl = imageBase64;
         
         // Dynamically import tfjs and mobilenet
         Promise.all([
           import('@tensorflow/tfjs'),
           import('@tensorflow-models/mobilenet')
         ]).then(([tf, mobilenet]) => {
           // Create an image element to classify
           const img = new Image();
           img.src = imageBase64;
           img.onload = async () => {
             try {
               await tf.ready(); // Ensure tf backend is ready
               const model = await mobilenet.load();
               const predictions = await model.classify(img);
               
               if (predictions && predictions.length > 0) {
                 const bestPred = predictions[0];
                 const predictedText = bestPred.className.toLowerCase();
                 const confidence = (bestPred.probability * 100).toFixed(1) + '%';
                 
                 // Map predictions to our categories
                 let category = 'Other';
                 if (predictedText.includes('plastic') || predictedText.includes('bottle')) category = 'Plastic';
                 else if (predictedText.includes('can') || predictedText.includes('metal')) category = 'Metal';
                 else if (predictedText.includes('paper') || predictedText.includes('book') || predictedText.includes('carton') || predictedText.includes('box')) category = 'Paper';
                 else if (predictedText.includes('glass') || predictedText.includes('jar')) category = 'Glass';
                 else if (predictedText.includes('computer') || predictedText.includes('phone') || predictedText.includes('keyboard') || predictedText.includes('mouse') || predictedText.includes('monitor') || predictedText.includes('tv') || predictedText.includes('television')) category = 'E-Waste';
                 else if (predictedText.includes('plant') || predictedText.includes('food') || predictedText.includes('apple')) category = 'Organic';
                 
                 (this.newRequest as any).aiPredictedCategory = category;
                 this.newRequest.wasteCategory = [category]; 
                 this.newRequest.description = (this.newRequest.description || '') + ` (AI Detection: ${bestPred.className} - Confidence: ${confidence})`;
                 this.errorMessage = null;
               } else {
                 this.errorMessage = 'AI could not detect any waste category.';
               }
             } catch (err) {
               console.error('TFJS Classification error:', err);
               this.errorMessage = 'AI Detection failed on device. Please select categories manually.';
             } finally {
               this.isAnalyzing = false;
               this.newRequest = { ...this.newRequest }; 
               this.cdr.detectChanges();
             }
           };
         }).catch(err => {
           console.error('Failed to load TensorFlow:', err);
           this.errorMessage = 'Failed to load AI model. Please select categories manually.';
           this.isAnalyzing = false;
           this.cdr.detectChanges();
         });
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmitPickup() {
    if (!this.currentUser) return;
    if (!this.newRequest.description || !this.newRequest.location) {
      this.errorMessage = 'Please provide a description and location.';
      return;
    }

    if (!this.newRequest.wasteCategory || this.newRequest.wasteCategory.length === 0) {
      this.errorMessage = 'Please select at least one waste category.';
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    this.wasteService.createRequest({
      ...this.newRequest,
      scheduledDate: this.newRequest.pickupDate,
      scheduledTime: this.newRequest.pickupTime,
      citizenId: this.currentUser.id,
      citizenName: this.currentUser.name
    }).subscribe({
      next: () => {
        this.submitSuccess = true;
        this.submitting = false;
        
        // Reset form
        this.newRequest = {
          wasteCategory: [],
          description: '',
          location: this.currentUser?.location || '',
          estimatedWeight: 0,
          pickupDate: new Date().toISOString().split('T')[0],
          pickupTime: '10:00'
        };

        setTimeout(() => {
          this.submitSuccess = false;
          this.router.navigate(['/citizen/dashboard']);
        }, 2000);
      },
      error: (err) => {
        console.error('Citizen pickup error:', err);
        this.errorMessage = err.error?.message || 'Submission failed. Please try again.';
        this.submitting = false;
      }
    });
  }

  onCategoryToggle(category: string) {
    const current = (this.newRequest.wasteCategory as string[]) || [];
    if (current.includes(category)) {
      this.newRequest.wasteCategory = current.filter(c => c !== category);
    } else {
      this.newRequest.wasteCategory = [...current, category];
    }
  }

  getCategoryIcon(cat: string | string[]): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }
}
