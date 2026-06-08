export interface WasteRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  location: string;
  wasteCategory: string[];
  description: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt?: string;
  weight?: number; // Added when completed
  scheduledDate?: string;
  scheduledTime?: string;
  qrCodeToken?: string;
  volunteerId?: string;
  volunteerName?: string;
}
