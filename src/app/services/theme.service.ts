import { Injectable, Renderer2, RendererFactory2, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    if (isPlatformBrowser(this.platformId)) {
      this.loadTheme();
    }
  }

  private loadTheme() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('wastezero_theme');
      const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
      
      const darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
      this.setTheme(darkMode);
    }
  }

  toggleTheme() {
    this.setTheme(!this.isDarkModeSubject.value);
  }

  private setTheme(isDark: boolean) {
    this.isDarkModeSubject.next(isDark);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('wastezero_theme', isDark ? 'dark' : 'light');
    }

    if (isPlatformBrowser(this.platformId)) {
      if (isDark) {
        this.renderer.addClass(document.body, 'dark-mode');
      } else {
        this.renderer.removeClass(document.body, 'dark-mode');
      }
    }
  }
}
