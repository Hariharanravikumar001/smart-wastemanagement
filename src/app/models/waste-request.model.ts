export interface WasteRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  location: string;
  wasteCategory: string[];
  description: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: Date;
  scheduledDate?: Date;
  weight?: number; // in kg, filled after collection
  volunteerId?: string;
  volunteerName?: string;
}
