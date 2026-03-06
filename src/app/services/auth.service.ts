import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'User' | 'Volunteer' | 'Admin' | 'Citizen';
  location?: string;
  password?: string;
  skills?: string[];
  wasteTypes?: string[]; // Types of waste the user is interested in/handles
  suspended?: boolean;
  assignedPickups?: string[]; // IDs of pickups assigned to the volunteer
  activityRecords?: {
    totalWeight: number;
    completedPickups: number;
    lastActive: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    if (typeof localStorage !== 'undefined') {
      const savedUser = localStorage.getItem('wastezero_user');
      if (savedUser) {
        this.currentUserSubject.next(JSON.parse(savedUser));
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
               id: response.token,
               role: this.mapRole(response.role),
               email: response.email || userCredentials.email,
               username: response.username || response.name,
               location: response.location
             }; 

             if (typeof localStorage !== 'undefined') {
                localStorage.setItem('wastezero_user', JSON.stringify(user));
                localStorage.setItem('wastezero_token', response.token);
             }
             this.currentUserSubject.next(user);
           }
        })
      );
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wastezero_user');
      localStorage.removeItem('wastezero_token');
    }
    this.currentUserSubject.next(null);
  }

  private mapRole(role: string): 'User' | 'Volunteer' | 'Admin' | 'Citizen' {
      if(role === 'admin') return 'Admin';
      if(role === 'volunteer') return 'Volunteer';
      return 'Citizen'; // Both 'user' and 'citizen' will map to 'Citizen'
  }

  // Uses actual backend API
  register(name: string, username: string, email: string, role: string, location: string, password?: string): Observable<any> {
      let mappedRole = role.toLowerCase();

      const registerData = {
          name,
          username,
          email,
          password: password || 'password123',
          role: mappedRole,
          location
      };

      return this.http.post<any>(`${this.apiUrl}/register`, registerData);
  }

  // Legacy Mock methods below (kept for partial compatibility if needed by other components)
  public getAllUsers(): User[] {
    if (typeof localStorage !== 'undefined') {
      const users = localStorage.getItem('wastezero_users');
      return users ? JSON.parse(users) : [];
    }
    return [];
  }

  authenticate(email: string): User {
    const users = this.getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    let user = users.find(u => u.email === cleanEmail);
    
    // Fallback if user didn't register (so the old mock admin@example.com still works)
    if (!user) {
      user = {
        id: Math.random().toString(36).substring(2, 11),
        name: cleanEmail.split('@')[0],
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'Citizen',
        password: 'password123',
        location: 'New York, USA'
      };
      if (cleanEmail.includes('admin')) {
        user.role = 'Admin';
        user.location = 'California, USA';
      }
      if (cleanEmail.includes('volunteer')) {
        user.role = 'Volunteer';
        user.location = 'London, UK';
      }
      if (cleanEmail.includes('user')) {
        user.role = 'User';
      }
      
      // Persist this auto-generated user so updateUserDetails works
      users.push(user);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wastezero_users', JSON.stringify(users));
      }
    }

    if (user && user.suspended) {
      throw new Error('This account has been suspended. Please contact support.');
    }
    return user;
  }

  setUserStatus(email: string, suspended: boolean): { success: boolean, message: string } {
    const users = this.getAllUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }

    users[userIndex].suspended = suspended;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wastezero_users', JSON.stringify(users));
      
      const currentUser = this.currentUserValue;
      if (currentUser && currentUser.email === email) {
        const updatedUser = { ...currentUser, suspended };
        this.login(updatedUser);
        if (suspended) {
          this.logout();
        }
      }
    }

    return { success: true, message: `User ${suspended ? 'suspended' : 'activated'} successfully` };
  }


  // Change Password
  changePassword(email: string, oldPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('wastezero_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.put<any>(`${this.apiUrl}/change-password`, { oldPassword, newPassword }, { headers })
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
    const token = localStorage.getItem('wastezero_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.put<any>(`${this.apiUrl}/profile`, details, { headers })
      .pipe(
        tap(response => {
          if (response && response.user) {
            const currentUser = this.currentUserValue;
            if (currentUser) {
              const updatedUser = { ...currentUser, ...response.user };
              if (response.user.role) {
                updatedUser.role = this.mapRole(response.user.role);
              }
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('wastezero_user', JSON.stringify(updatedUser));
              }
              this.currentUserSubject.next(updatedUser);
            }
          }
        })
      );
  }
}
