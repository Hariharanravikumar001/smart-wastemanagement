import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OpportunityListComponent } from './pages/opportunities/opportunity-list/opportunity-list.component';
import { OpportunityFormComponent } from './pages/opportunities/opportunity-form/opportunity-form.component';
import { OpportunityDetailComponent } from './pages/opportunities/opportunity-detail/opportunity-detail.component';
import { ChatComponent } from './pages/chat/chat.component';
import { MessagesComponent } from './pages/messages/messages.component';
import { AdminComponent } from './pages/admin/admin.component';
import { PickupRequestComponent } from './pages/pickup-request/pickup-request.component';
import { AuthGuard } from './guards/auth.guard';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { TermsOfServiceComponent } from './pages/terms-of-service/terms-of-service.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { AboutUsComponent } from './pages/about-us/about-us.component';

const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'services', loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent) },
  { path: 'about-us', loadComponent: () => import('./pages/about-us/about-us.component').then(m => m.AboutUsComponent) },
  { path: 'terms-of-service', loadComponent: () => import('./pages/terms-of-service/terms-of-service.component').then(m => m.TermsOfServiceComponent) },
  { path: 'privacy-policy', loadComponent: () => import('./pages/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent) },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },

  { path: 'opportunities', loadComponent: () => import('./pages/opportunities/opportunity-list/opportunity-list.component').then(m => m.OpportunityListComponent), canActivate: [AuthGuard] },
  { path: 'opportunities/new', loadComponent: () => import('./pages/opportunities/opportunity-form/opportunity-form.component').then(m => m.OpportunityFormComponent), canActivate: [AuthGuard] },
  { path: 'opportunities/edit/:id', loadComponent: () => import('./pages/opportunities/opportunity-form/opportunity-form.component').then(m => m.OpportunityFormComponent), canActivate: [AuthGuard] },
  { path: 'opportunities/:id', loadComponent: () => import('./pages/opportunities/opportunity-detail/opportunity-detail.component').then(m => m.OpportunityDetailComponent), canActivate: [AuthGuard] },
  { path: 'messages', loadComponent: () => import('./pages/messages/messages.component').then(m => m.MessagesComponent), canActivate: [AuthGuard] },
  { path: 'chat/:userId/:name', loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent), canActivate: [AuthGuard] },
  { path: 'chat/:userId', loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent), canActivate: [AuthGuard] },
  { 
    path: 'admin', 
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), 
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'ngo'] }
  },
  { path: 'pickup-request', loadComponent: () => import('./pages/pickup-request/pickup-request.component').then(m => m.PickupRequestComponent), canActivate: [AuthGuard] },

  // Citizen Routes
  { 
    path: 'citizen', 
    loadComponent: () => import('./pages/citizen/layout/layout.component').then(m => m.CitizenLayoutComponent),
    canActivate: [AuthGuard],
    data: { roles: ['user', 'citizen'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/citizen/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'pickup-request', loadComponent: () => import('./pages/citizen/pickup-request/pickup-request.component').then(m => m.PickupRequestComponent) },
      { path: 'pickup-history', loadComponent: () => import('./pages/citizen/pickup-history/pickup-history.component').then(m => m.PickupHistoryComponent) },
      { path: 'statistics', loadComponent: () => import('./pages/citizen/statistics/statistics.component').then(m => m.StatisticsComponent) },
      { path: 'messages', loadComponent: () => import('./pages/citizen/messages/messages.component').then(m => m.CitizenMessagesComponent) },
      { path: 'profile', loadComponent: () => import('./pages/citizen/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Volunteer Routes
  { 
    path: 'volunteer', 
    loadComponent: () => import('./pages/volunteer/layout/layout.component').then(m => m.VolunteerLayoutComponent),
    canActivate: [AuthGuard],
    data: { roles: ['volunteer'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/volunteer/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'opportunities', loadComponent: () => import('./pages/volunteer/opportunities/opportunities.component').then(m => m.OpportunitiesComponent) },
      { path: 'my-pickups', loadComponent: () => import('./pages/volunteer/my-pickups/my-pickups.component').then(m => m.MyPickupsComponent) },
      { path: 'messages', loadComponent: () => import('./pages/volunteer/messages/messages.component').then(m => m.VolunteerMessagesComponent) },
      { path: 'profile', loadComponent: () => import('./pages/volunteer/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
