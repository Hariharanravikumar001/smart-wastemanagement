import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  constructor() {
    this.loadStats();
  }

  private loadStats(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.statsSubject.next(JSON.parse(stored));
      } else {
        // Initial "real" looking baseline
        const initialStats: DashboardStats = {
          completedPickups: 15420,
          completedPickupsChange: '+2.4k this week',
          systemHealth: '99.9%',
          systemHealthStatus: 'Stable across 4 regions',
          activeUsers: 0,
          activeUsersChange: '+5.2% from last month',
          totalVolunteers: 0,
          totalVolunteersChange: '+12 new today'
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
    const current = this.statsSubject.value;
    this.updateStats({ completedPickups: current.completedPickups + 1 });
  }
}
