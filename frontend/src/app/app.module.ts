import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LoginComponent } from './components/login/login.component';
import { PatientsListComponent } from './components/patients-list/patients-list.component';
import { OrdersComponent } from './components/orders/orders.component';
import { DietPlanEditorComponent } from './components/diet-plan-editor/diet-plan-editor.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ConfirmDeliverModalComponent } from './components/orders/confirm-deliver-modal.component';
import { ToastService } from './services/toast.service';
import { PatientCreateComponent } from './components/patient-create/patient-create.component';
import { FormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminInviteComponent } from './components/admin-invite/admin-invite.component';
import { ManualOrderComponent } from './components/manual-order/manual-order.component';
import { AdminMenuComponent } from './components/admin-menu/admin-menu.component';
import { AdminDietsComponent } from './components/admin-diets/admin-diets.component';
import { ReportsDashboardComponent } from './components/reports-dashboard/reports-dashboard.component';
import { DietSupervisorComponent } from './components/diet-supervisor/diet-supervisor.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuditLogViewerComponent } from './components/audit-log-viewer/audit-log-viewer.component';
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';
import { AuthInterceptor } from './services/auth-interceptor.service';
import { VendorRegisterComponent } from './components/vendor-register/vendor-register.component';
import { SADashboardComponent } from './components/super-admin/dashboard/sa-dashboard.component';
import { SAVendorsComponent } from './components/super-admin/vendors/sa-vendors.component';
import { SAVendorDetailComponent } from './components/super-admin/vendor-detail/sa-vendor-detail.component';
import { SAHospitalsComponent } from './components/super-admin/hospitals/sa-hospitals.component';
import { SARequestsComponent } from './components/super-admin/requests/sa-requests.component';
import { VendorHospitalsComponent } from './components/vendor-hospitals/vendor-hospitals.component';

@NgModule({
  declarations: [AppComponent, LoginComponent, PatientsListComponent, OrdersComponent, DietPlanEditorComponent, ToastContainerComponent, ConfirmDeliverModalComponent, PatientCreateComponent, PatientDetailComponent, AdminUsersComponent, AdminInviteComponent, ManualOrderComponent, AdminMenuComponent, ReportsDashboardComponent, DietSupervisorComponent, AdminDietsComponent, DashboardComponent, AuditLogViewerComponent, NotificationBellComponent, VendorRegisterComponent, SADashboardComponent, SAVendorsComponent, SAVendorDetailComponent, SAHospitalsComponent, SARequestsComponent, VendorHospitalsComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, FormsModule, NgxEchartsModule.forRoot({ echarts: () => import('echarts') })],
  providers: [
    ToastService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
