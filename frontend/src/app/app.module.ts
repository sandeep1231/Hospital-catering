import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
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
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminInviteComponent } from './components/admin-invite/admin-invite.component';
import { ManualOrderComponent } from './components/manual-order/manual-order.component';

@NgModule({
  declarations: [AppComponent, LoginComponent, PatientsListComponent, OrdersComponent, DietPlanEditorComponent, ToastContainerComponent, ConfirmDeliverModalComponent, PatientCreateComponent, PatientDetailComponent, RegisterComponent, AdminUsersComponent, AdminInviteComponent, ManualOrderComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, FormsModule],
  providers: [ToastService],
  bootstrap: [AppComponent]
})
export class AppModule { }
