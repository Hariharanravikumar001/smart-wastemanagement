import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OpportunityListComponent } from './pages/opportunities/opportunity-list/opportunity-list.component';
import { OpportunityFormComponent } from './pages/opportunities/opportunity-form/opportunity-form.component';
import { AdminComponent } from './pages/admin/admin.component';
import { OpportunityDetailComponent } from './pages/opportunities/opportunity-detail/opportunity-detail.component';
import { ChatComponent } from './pages/chat/chat.component';
import { PickupRequestComponent } from './pages/pickup-request/pickup-request.component';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    RouterModule,
    OpportunityDetailComponent,
    ChatComponent,
    OpportunityFormComponent,
    DashboardComponent,
    OpportunityListComponent,
    AdminComponent,
    LandingComponent,
    LoginComponent,
    RegisterComponent,
    PickupRequestComponent
  ],
  providers: [
    provideClientHydration(),
    provideHttpClient(withFetch()),
    DatePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
