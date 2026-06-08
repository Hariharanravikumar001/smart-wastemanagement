export interface Opportunity {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  wasteType?: string | string[];
  location: string;
  skills: string[];
  skillsRequired?: string[];
  duration: string;
  status?: string;
  ngo_id?: any;
  organizationId?: string;
  organizationName?: string;
  applicantCount?: number;
  applicantNames?: string[];
  totalScore?: number;
  // Scheduling
  startDate?: string;
  startTime?: string;
  scheduleType?: 'none' | 'daily' | 'weekly-2' | 'weekly-3';
  scheduleDays?: string[];
  scheduleTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

