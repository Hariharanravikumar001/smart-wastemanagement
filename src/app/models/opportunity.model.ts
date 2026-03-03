export interface Opportunity {
  id: string;
  title: string;
  description: string;
  wasteType: string; // e.g., 'Plastic', 'E-Waste', 'Organic'
  location: string;
  skillsRequired: string[];
  duration: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
}
