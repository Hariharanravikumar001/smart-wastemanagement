export interface WasteRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  location: string;
  wasteCategory: 'Plastic' | 'Organic' | 'E-Waste' | 'Metal' | 'Glass' | 'Paper' | 'Hazardous' | 'Other';
  description: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: Date;
  scheduledDate?: Date;
  weight?: number; // in kg, filled after collection
  volunteerId?: string;
  volunteerName?: string;
}
