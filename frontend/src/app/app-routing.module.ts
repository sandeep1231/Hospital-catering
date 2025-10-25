import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { PatientsListComponent } from './components/patients-list/patients-list.component';
import { PatientCreateComponent } from './components/patient-create/patient-create.component';
import { PatientDetailComponent } from './components/patient-detail/patient-detail.component';
import { OrdersComponent } from './components/orders/orders.component';
import { DietPlanEditorComponent } from './components/diet-plan-editor/diet-plan-editor.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminInviteComponent } from './components/admin-invite/admin-invite.component';
import { AdminDietsComponent } from './components/admin-diets/admin-diets.component';
import { ManualOrderComponent } from './components/manual-order/manual-order.component';
import { AdminGuard } from './guards/admin.guard';
import { AdminMenuComponent } from './components/admin-menu/admin-menu.component';
import { ReportsDashboardComponent } from './components/reports-dashboard/reports-dashboard.component';
import { DietSupervisorComponent } from './components/diet-supervisor/diet-supervisor.component';

const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [AdminGuard] },
  { path: 'admin/invite', component: AdminInviteComponent, canActivate: [AdminGuard] },
  { path: 'orders/new', component: ManualOrderComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/patients', pathMatch: 'full' },
  { path: 'patients', component: PatientsListComponent, canActivate: [AuthGuard] },
  { path: 'patients/new', component: PatientCreateComponent, canActivate: [AuthGuard] },
  { path: 'patients/:id', component: PatientDetailComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
  { path: 'diet-plans', component: DietPlanEditorComponent, canActivate: [AuthGuard] },
  { path: 'admin/menu', component: AdminMenuComponent, canActivate: [AdminGuard] },
  { path: 'admin/diets', component: AdminDietsComponent, canActivate: [AdminGuard] },
  
  { path: 'reports', component: ReportsDashboardComponent, canActivate: [AdminGuard] },
  { path: 'diet-supervisor', component: DietSupervisorComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
