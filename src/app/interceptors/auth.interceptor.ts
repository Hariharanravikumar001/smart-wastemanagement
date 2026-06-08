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

    let clonedReq = req;

    // Fix relative URLs during SSR to prevent "Invalid URL" crash
    if (!isPlatformBrowser(this.platformId) && req.url.startsWith('/')) {
      clonedReq = req.clone({
        url: `http://localhost:5000${req.url}`
      });
    }

    // Only add token if it's an API request and NOT a login/register request
    const isApiRequest = clonedReq.url.includes('/api');
    const isPublicRoute = clonedReq.url.includes('/login') || clonedReq.url.includes('/register');

    if (token && isApiRequest && !isPublicRoute) {
      clonedReq = clonedReq.clone({
        headers: clonedReq.headers.set('Authorization', `Bearer ${token}`)
      });
    }
    
    return next.handle(clonedReq);
  }
}
