import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isBrowser = isPlatformBrowser(this.platformId);
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      if (route.data && route.data['roles']) {
        const userRole = currentUser.role.toLowerCase();
        const allowedRoles = route.data['roles'].map((r: string) => r.toLowerCase());
        
        const isAllowed = allowedRoles.some((role: string) => {
          if (role === 'citizen' || role === 'user') return userRole === 'citizen' || userRole === 'user';
          return role === userRole;
        });

        if (!isAllowed) {
          if (isBrowser) {
            console.warn('Unauthorized access blocked by AuthGuard:', userRole, 'not in', allowedRoles);
            this.router.navigate(['/']);
          }
          return false;
        }
      }
      return true;
    }

    if (isBrowser) {
      // Not logged in so redirect to login page with the return url
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    }
    
    // On server, we return true to allow hydration to take over in the browser
    return !isBrowser;
  }
}
