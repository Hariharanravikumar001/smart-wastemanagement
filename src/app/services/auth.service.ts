import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'User' | 'Volunteer' | 'Admin' | 'Citizen' | 'NGO';
  location?: string;
  password?: string;
  bio?: string;
  skills?: string[];
  wasteTypes?: string[]; // Types of waste the user is interested in/handles
  isSuspended?: boolean;
  assignedPickups?: string[]; // IDs of pickups assigned to the volunteer
  profileImage?: string;
  isOnline?: boolean;
  lastActive?: Date | string;
  activityRecords?: {
    totalWeight: number;
    completedPickups: number;
    lastActive: Date;
  };
  created_at?: Date | string;
  rewardPoints?: number;
  badges?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private http: HttpClient
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const savedUser = localStorage.getItem('wastezero_user');
      const token = localStorage.getItem('wastezero_token');
      
      if (savedUser && token) {
        // Simple JWT expiration check
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiry = payload.exp * 1000;
          if (Date.now() > expiry) {
            console.warn('Session expired. Logging out.');
            this.logout();
          } else {
            this.currentUserSubject.next(JSON.parse(savedUser));
          }
        } catch (e) {
          console.error('Invalid token found. Clearing session.');
          this.logout();
        }
      } else if (savedUser && !token) {
        // Inconsistent state
        this.logout();
      }
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Uses actual backend API
  login(userCredentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, userCredentials)
      .pipe(
        tap(response => {
           if (response && response.token) {
             const user: User = { 
               ...response, 
               id: response.id || response._id || response.token, // Fallback to token only if absolutely necessary
               role: this.mapRole(response.role),
               email: response.email || userCredentials.email,
               username: response.username || response.name,
               location: response.location
             }; 

             if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem('wastezero_user', JSON.stringify(user));
                localStorage.setItem('wastezero_token', response.token);
             }
             this.currentUserSubject.next(user);
           }
        }),
        catchError(err => {
          if (err.status === 0) {
            console.error('Connection refuse: Please ensure your backend server is running on port 5000.');
            return throwError(() => new Error('Unable to connect to backend server. Is it running?'));
          }
          return throwError(() => err);
        })
      );
  }

  googleLogin(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/google-login`, { idToken })
      .pipe(
        tap(response => {
          if (response && response.token) {
            const user: User = { 
               ...response, 
               id: response.id || response._id,
               role: this.mapRole(response.role)
             }; 

            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('wastezero_user', JSON.stringify(user));
              localStorage.setItem('wastezero_token', response.token);
            }
            this.currentUserSubject.next(user);
          }
        })
      );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('wastezero_user');
      localStorage.removeItem('wastezero_token');
    }
    this.currentUserSubject.next(null);
  }

  private mapRole(role: string): 'User' | 'Volunteer' | 'Admin' | 'Citizen' | 'NGO' {
    if (!role) {
      console.warn('⚠️ [AUTH] Missing role in data. Defaulting to Citizen.');
      return 'Citizen';
    }
    const r = role.toLowerCase();
    if (r === 'admin') return 'Admin';
    if (r === 'volunteer' || r === 'agent') return 'Volunteer';
    if (r === 'ngo' || r === 'organization') return 'NGO';
    if (r === 'user' || r === 'citizen' || r === 'resident') return 'Citizen';
    
    console.debug('🔍 [AUTH] Unmapped role found:', r, 'Mapping to Citizen.');
    return 'Citizen'; 
  }

  // Uses actual backend API
  register(name: string, username: string, email: string, role: string, location: string, password?: string, contactNumber?: string): Observable<any> {
      let mappedRole = role.toLowerCase();

      const registerData = {
          name,
          username,
          email,
          password: password || 'password123',
          role: mappedRole,
          location,
          contactNumber
      };
      
      return this.http.post<any>(`${this.apiUrl}/register`, registerData).pipe(
        catchError(err => {
          if (err.status === 0) {
            console.error('Connection refuse: Please ensure your backend server is running on port 5000.');
            return throwError(() => new Error('Unable to connect to backend server. Is it running?'));
          }
          return throwError(() => err);
        })
      );
  }

  // Legacy Mock methods below (kept for partial compatibility if needed by other components)
  public getAllUsers(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/admin/users`).pipe(
      map(response => {
        const users = response.users || (Array.isArray(response) ? response : []);
        return users.map((u: any) => ({
          ...u,
          id: u.id || u._id,
          role: this.mapRole(u.role)
        }));
      })
    );
  }

  setUserStatus(userId: string, isSuspended: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/user-status`, { userId, isSuspended });
  }


  // Change Password
  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/change-password`, { oldPassword, newPassword })
      .pipe(
        tap(response => {
          // Success handled in component
        })
      );
  }

  // Request OTP for Forgotten Password
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email });
  }

  // Verify the OTP sent to email
  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  // Reset the password with verified OTP
  resetPassword(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { email, otp, newPassword });
  }

  // Update User Details
  updateUserDetails(email: string, details: Partial<User>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, details)
      .pipe(
        tap(response => {
          if (response && response.user) {
            const currentUser = this.currentUserValue;
            if (currentUser) {
              const updatedUser = { ...currentUser, ...response.user };
              if (response.user.role) {
                updatedUser.role = this.mapRole(response.user.role);
              }
              if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem('wastezero_user', JSON.stringify(updatedUser));
              }
              this.currentUserSubject.next(updatedUser);
            }
          }
        })
      );
  }

  // Delete Account
  deleteAccount(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/profile`)
      .pipe(
        tap(() => {
          this.logout();
        })
      );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}`).pipe(
      map(response => ({
        ...response,
        id: response.id || response._id,
        role: this.mapRole(response.role)
      }))
    );
  }

  refreshCurrentUser(): void {
    this.http.get<User>(`${this.apiUrl}/me`).subscribe({
      next: (user) => {
        if (user) {
          const formattedUser = {
            ...user,
            id: (user as any)._id || user.id,
            role: this.mapRole(user.role)
          };
          this.currentUserSubject.next(formattedUser);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('wastezero_user', JSON.stringify(formattedUser));
          }
        }
      },
      error: (err) => {
        // Prevent accidental logout on transient network errors or server downtime
        if (err.status === 401) {
          console.error('🔓 [AUTH] Session invalid (401). Logging out.');
          this.logout();
        } else if (err.status === 0) {
          console.warn('⚠️ [AUTH] Network error during refresh. Maintaining existing session.');
        } else {
          console.error('❌ [AUTH] Background refresh failed:', err);
        }
      }
    });
  }

  uploadProfileImage(file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result as string;
        this.http.post<any>(`${this.apiUrl}/upload-profile-image`, { profileImage: base64Image })
          .subscribe({
            next: (response) => {
              const currentUser = this.currentUserValue;
              if (currentUser && response.profileImage) {
                const updatedUser = { ...currentUser, profileImage: response.profileImage };
                if (isPlatformBrowser(this.platformId)) {
                  localStorage.setItem('wastezero_user', JSON.stringify(updatedUser));
                }
                this.currentUserSubject.next(updatedUser);
              }
              observer.next(response);
              observer.complete();
            },
            error: (err) => {
              observer.error(err);
            }
          });
      };
      reader.onerror = (error) => observer.error(error);
      reader.readAsDataURL(file);
    });
  }
}
