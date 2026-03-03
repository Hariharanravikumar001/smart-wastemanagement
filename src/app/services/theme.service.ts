import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadTheme();
  }

  private loadTheme() {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('wastezero_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
      this.setTheme(darkMode);
    }
  }

  toggleTheme() {
    this.setTheme(!this.isDarkModeSubject.value);
  }

  private setTheme(isDark: boolean) {
    this.isDarkModeSubject.next(isDark);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wastezero_theme', isDark ? 'dark' : 'light');
    }

    if (isDark) {
      this.renderer.addClass(document.body, 'dark-mode');
    } else {
      this.renderer.removeClass(document.body, 'dark-mode');
    }
  }
}
