export interface Opportunity {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  wasteType?: string; // Kept for UI backward compatibility if needed
  location: string;
  skills: string[];
  skillsRequired?: string[]; // Alias for backward compatibility
  duration: string;
  status?: string;
  ngo_id?: any; // populated object or string
  organizationId?: string; // Alias
  organizationName?: string; // Alias
  applicantCount?: number;
  applicantNames?: string[];
  totalScore?: number; // Added for matching logic
  createdAt?: Date;
  updatedAt?: Date;
}

