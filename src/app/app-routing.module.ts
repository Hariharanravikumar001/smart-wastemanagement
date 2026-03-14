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
import { AdminComponent } from './pages/admin/admin.component';
import { PickupRequestComponent } from './pages/pickup-request/pickup-request.component';
import { AuthGuard } from './guards/auth.guard';
import { ServicesComponent } from './pages/services/services.component';
import { ContactComponent } from './pages/contact/contact.component';
import { TermsOfServiceComponent } from './pages/terms-of-service/terms-of-service.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { AboutUsComponent } from './pages/about-us/about-us.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'about-us', component: AboutUsComponent },
  { path: 'terms-of-service', component: TermsOfServiceComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },

  { path: 'opportunities', component: OpportunityListComponent, canActivate: [AuthGuard] },
  { path: 'opportunities/new', component: OpportunityFormComponent, canActivate: [AuthGuard] },
  { path: 'opportunities/edit/:id', component: OpportunityFormComponent, canActivate: [AuthGuard] },
  { path: 'opportunities/:id', component: OpportunityDetailComponent, canActivate: [AuthGuard] },
  { path: 'chat/:userId/:name', component: ChatComponent, canActivate: [AuthGuard] },
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [AuthGuard],
    data: { roles: ['Admin'] }
  },
  { path: 'pickup-request', component: PickupRequestComponent, canActivate: [AuthGuard] },

  // Citizen Routes
  { 
    path: 'citizen', 
    loadComponent: () => import('./pages/citizen/layout/layout.component').then(m => m.CitizenLayoutComponent),
    canActivate: [AuthGuard],
    data: { roles: ['User', 'Citizen'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/citizen/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'pickup-request', loadComponent: () => import('./pages/citizen/pickup-request/pickup-request.component').then(m => m.PickupRequestComponent) },
      { path: 'pickup-history', loadComponent: () => import('./pages/citizen/pickup-history/pickup-history.component').then(m => m.PickupHistoryComponent) },
      { path: 'statistics', loadComponent: () => import('./pages/citizen/statistics/statistics.component').then(m => m.StatisticsComponent) },
      { path: 'messages', loadComponent: () => import('./pages/citizen/messages/messages.component').then(m => m.MessagesComponent) },
      { path: 'profile', loadComponent: () => import('./pages/citizen/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Volunteer Routes
  { 
    path: 'volunteer', 
    loadComponent: () => import('./pages/volunteer/layout/layout.component').then(m => m.VolunteerLayoutComponent),
    canActivate: [AuthGuard],
    data: { roles: ['Volunteer'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/volunteer/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'opportunities', loadComponent: () => import('./pages/volunteer/opportunities/opportunities.component').then(m => m.OpportunitiesComponent) },
      { path: 'my-pickups', loadComponent: () => import('./pages/volunteer/my-pickups/my-pickups.component').then(m => m.MyPickupsComponent) },
      { path: 'messages', loadComponent: () => import('./pages/volunteer/messages/messages.component').then(m => m.MessagesComponent) },
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
