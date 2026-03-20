import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  template: `
  <div class="container mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Dashboard</h4>
      <div class="text-muted small">{{ todayStr }}</div>
    </div>

    <!-- Loading state -->
    <div *ngIf="loading" class="row g-3 mb-4">
      <div class="col-6 col-md-4 col-lg-2" *ngFor="let i of [1,2,3,4,5,6]">
        <div class="card">
          <div class="card-body placeholder-glow">
            <div class="placeholder col-7 mb-2"></div>
            <div class="placeholder col-4" style="height: 2rem;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div *ngIf="!loading" class="row g-3 mb-4">
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-primary h-100 kpi-card" (click)="go('/patients')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">Total Patients</div>
            <div class="fs-3 fw-bold text-primary">{{ stats.totalPatients }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-success h-100 kpi-card" (click)="goFiltered('in_patient')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">In-Patients</div>
            <div class="fs-3 fw-bold text-success">{{ stats.inPatients }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-secondary h-100 kpi-card" (click)="goFiltered('discharged')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">Discharged</div>
            <div class="fs-3 fw-bold text-secondary">{{ stats.discharged }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-warning h-100 kpi-card" (click)="go('/diet-supervisor')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">Diets Pending</div>
            <div class="fs-3 fw-bold text-warning">{{ stats.todayDietPending }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-success h-100 kpi-card" (click)="go('/diet-supervisor')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">Diets Delivered</div>
            <div class="fs-3 fw-bold text-success">{{ stats.todayDietDelivered }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card border-danger h-100 kpi-card" (click)="go('/diet-supervisor')" role="button">
          <div class="card-body text-center">
            <div class="text-muted small mb-1">Diets Cancelled</div>
            <div class="fs-3 fw-bold text-danger">{{ stats.todayDietCancelled }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-4">
      <div class="card-header"><h6 class="mb-0">Quick Actions</h6></div>
      <div class="card-body">
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary" (click)="go('/patients/new')" *ngIf="canCreate">New Patient</button>
          <button class="btn btn-outline-primary" (click)="go('/patients')">View Patients</button>
          <button class="btn btn-outline-primary" (click)="go('/diet-supervisor')">Diet Supervisor</button>
          <button class="btn btn-outline-primary" (click)="go('/orders')">Orders</button>
          <button class="btn btn-outline-secondary" *ngIf="isAdmin" (click)="go('/reports')">Reports</button>
          <button class="btn btn-outline-secondary" *ngIf="isAdmin" (click)="go('/admin/audit-logs')">Audit Logs</button>
        </div>
      </div>
    </div>

    <!-- Today's Diet Summary -->
    <div class="card" *ngIf="!loading && stats.todayDietPending + stats.todayDietDelivered + stats.todayDietCancelled > 0">
      <div class="card-header"><h6 class="mb-0">Today's Diet Progress</h6></div>
      <div class="card-body">
        <div class="progress" style="height: 28px;">
          <div class="progress-bar bg-success" role="progressbar"
            [style.width.%]="dietPercent('delivered')"
            [attr.aria-valuenow]="stats.todayDietDelivered">
            {{ stats.todayDietDelivered }} Delivered
          </div>
          <div class="progress-bar bg-warning text-dark" role="progressbar"
            [style.width.%]="dietPercent('pending')"
            [attr.aria-valuenow]="stats.todayDietPending">
            {{ stats.todayDietPending }} Pending
          </div>
          <div class="progress-bar bg-danger" role="progressbar"
            [style.width.%]="dietPercent('cancelled')"
            [attr.aria-valuenow]="stats.todayDietCancelled">
            {{ stats.todayDietCancelled }} Cancelled
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .kpi-card { cursor: pointer; transition: transform .1s ease, box-shadow .1s ease; }
    .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  `]
})
export class DashboardComponent implements OnInit {
  loading = true;
  todayStr = '';
  stats: any = {
    totalPatients: 0, inPatients: 0, discharged: 0,
    todayDietPending: 0, todayDietDelivered: 0, todayDietCancelled: 0
  };

  constructor(private api: ApiService, private router: Router) {
    const d = new Date();
    this.todayStr = d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  ngOnInit() {
    this.api.get('/patients/dashboard/stats').subscribe((res: any) => {
      this.stats = res;
      this.loading = false;
    }, () => { this.loading = false; });
  }

  get isAdmin() { return this.api.getUserRole() === 'admin'; }
  get canCreate() { const r = this.api.getUserRole(); return r === 'admin' || r === 'diet-supervisor'; }

  dietPercent(status: string): number {
    const total = this.stats.todayDietPending + this.stats.todayDietDelivered + this.stats.todayDietCancelled;
    if (total === 0) return 0;
    const val = status === 'delivered' ? this.stats.todayDietDelivered :
                status === 'pending' ? this.stats.todayDietPending : this.stats.todayDietCancelled;
    return Math.round((val / total) * 100);
  }

  go(path: string) { this.router.navigate([path]); }
  goFiltered(status: string) { this.router.navigate(['/patients'], { queryParams: { status } }); }
}
