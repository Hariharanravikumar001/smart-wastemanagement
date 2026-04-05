import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('wastezero_token') || '';
    }

    // Only add token if it's an API request and NOT a login/register request
    const isApiRequest = req.url.startsWith('/api') || req.url.includes(':5000/api');
    const isPublicRoute = req.url.includes('/login') || req.url.includes('/register');

    if (token && isApiRequest && !isPublicRoute) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }
    
    return next.handle(req);
  }
}
