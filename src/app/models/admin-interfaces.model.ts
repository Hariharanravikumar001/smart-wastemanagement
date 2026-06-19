export interface EngagementAnalytics {
  totalImpact?: number;
  totalImpactChange?: number;
  responseRate?: number;
  responseRateChange?: number;
  activeUsers?: number;
  activeUsersChange?: number;
  totalVolunteers?: number;
  totalVolunteersChange?: number;
  completedPickups?: number;
  trends?: {
    labels: string[];
    data: number[];
  };
  monthlyCollections?: {
    labels: string[];
    data: number[];
  };
  recyclingRate?: {
    labels: string[];
    data: number[];
  };
  userGrowth?: {
    labels: string[];
    data: number[];
  };
  pickupSuccessRate?: {
    labels: string[];
    data: number[];
  };
}

export interface OpportunityForm {
  title: string;
  description: string;
  skills: string;
  duration: string;
  location: string;
  wasteType: string[];
  status: string;
  // Scheduling
  startDate: string;
  startTime: string;
  scheduleType: 'none' | 'daily' | 'weekly-2' | 'weekly-3';
  scheduleDays: string[];
  scheduleTime: string;
}

export interface OppStats {
  byType?: { [key: string]: number };
}

export interface ProfileForm {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  message?: string;
  isError?: boolean;
}
