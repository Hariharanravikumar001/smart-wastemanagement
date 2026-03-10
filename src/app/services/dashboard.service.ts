import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WasteRequestService } from './waste-request.service';
import { AuthService } from './auth.service';

export interface DashboardStats {
  completedPickups: number;
  completedPickupsChange: string;
  systemHealth: string;
  systemHealthStatus: string;
  activeUsers: number;
  activeUsersChange: string;
  totalVolunteers: number;
  totalVolunteersChange: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private statsSubject = new BehaviorSubject<DashboardStats>({
    completedPickups: 15420,
    completedPickupsChange: '+2.4k this week',
    systemHealth: '99.9%',
    systemHealthStatus: 'Stable across 4 regions',
    activeUsers: 0,
    activeUsersChange: '+5.2% from last month',
    totalVolunteers: 0,
    totalVolunteersChange: '+12 new today'
  });

  public stats$: Observable<DashboardStats> = this.statsSubject.asObservable();
  private readonly STORAGE_KEY = 'wastezero_dashboard_stats';

  constructor(
    private wasteRequestService: WasteRequestService,
    private authService: AuthService
  ) {
    this.loadStats();
    this.initRealTimeStats();
  }

  private initRealTimeStats(): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Sync completed pickups from real requests
    this.wasteRequestService.requests$.subscribe(requests => {
      const completed = requests.filter((r: any) => r.status === 'Completed');
      const completedCount = completed.length;
      
      const recentCompleted = completed.filter((r: any) => {
        const date = r.createdAt ? new Date(r.createdAt) : new Date();
        return date >= oneWeekAgo;
      }).length;

      const growth = completedCount > recentCompleted 
        ? ((recentCompleted / (completedCount - recentCompleted)) * 100).toFixed(1)
        : (recentCompleted > 0 ? '100' : '0');

      this.updateStats({ 
        completedPickups: completedCount,
        completedPickupsChange: `+${growth}% this week`
      });
    });

    // Sync user stats
    const allUsers = this.authService.getAllUsers();
    const volunteers = allUsers.filter((u: any) => u.role === 'Volunteer');
    const activeUsers = allUsers.filter((u: any) => !u.suspended);

    // Volunteer growth
    const recentVolunteers = volunteers.filter((u: any) => {
      const date = u.created_at ? new Date(u.created_at) : new Date();
      return date >= oneWeekAgo;
    }).length;
    const vGrowth = volunteers.length > recentVolunteers
      ? ((recentVolunteers / (volunteers.length - recentVolunteers)) * 100).toFixed(1)
      : (recentVolunteers > 0 ? '100' : '0');

    // Active users growth
    const recentUsers = activeUsers.filter((u: any) => {
      const date = u.created_at ? new Date(u.created_at) : new Date();
      return date >= oneWeekAgo;
    }).length;
    const uGrowth = activeUsers.length > recentUsers
      ? ((recentUsers / (activeUsers.length - recentUsers)) * 100).toFixed(1)
      : (recentUsers > 0 ? '100' : '0');

    this.updateStats({
      totalVolunteers: volunteers.length,
      totalVolunteersChange: `+${vGrowth}% weekly`,
      activeUsers: activeUsers.length,
      activeUsersChange: `+${uGrowth}% weekly`
    });
  }

  private loadStats(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.statsSubject.next(JSON.parse(stored));
      } else {
        // Real-time stats will overwrite these soon anyway
        const initialStats: DashboardStats = {
          completedPickups: 0,
          completedPickupsChange: 'Live data',
          systemHealth: '100%',
          systemHealthStatus: 'All systems operational',
          activeUsers: 0,
          activeUsersChange: 'Live data',
          totalVolunteers: 0,
          totalVolunteersChange: 'Live data'
        };
        this.saveStats(initialStats);
      }
    }
  }

  public updateStats(partial: Partial<DashboardStats>): void {
    const current = this.statsSubject.value;
    const updated = { ...current, ...partial };
    this.saveStats(updated);
  }

  private saveStats(stats: DashboardStats): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
    }
    this.statsSubject.next(stats);
  }

  public incrementPickups(): void {
    // This method is now legacy as pickups come from actual data, but we'll keep it for compatibility if used elsewhere
    const current = this.statsSubject.value;
    this.updateStats({ completedPickups: current.completedPickups + 1 });
  }
}
