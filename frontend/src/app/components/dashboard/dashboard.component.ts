import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  template: `
  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1"><i class="bi bi-grid-1x2 me-2" style="color: var(--uf-primary);"></i>Dashboard</h4>
        <div class="text-muted small">{{ todayStr }}</div>
      </div>
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
        <div class="card h-100 kpi-card border-0" (click)="go('/patients')" role="button" style="background: linear-gradient(135deg, #0d9488, #10b981); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-people fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">Total Patients</div>
            <div class="fs-3 fw-bold">{{ stats.totalPatients }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card h-100 kpi-card border-0" (click)="goFiltered('in_patient')" role="button" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-person-check fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">In-Patients</div>
            <div class="fs-3 fw-bold">{{ stats.inPatients }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card h-100 kpi-card border-0" (click)="goFiltered('discharged')" role="button" style="background: linear-gradient(135deg, #475569, #64748b); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-person-dash fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">Discharged</div>
            <div class="fs-3 fw-bold">{{ stats.discharged }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card h-100 kpi-card border-0" (click)="go('/diet-supervisor')" role="button" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-hourglass-split fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">Diets Pending</div>
            <div class="fs-3 fw-bold">{{ stats.todayDietPending }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card h-100 kpi-card border-0" (click)="go('/diet-supervisor')" role="button" style="background: linear-gradient(135deg, #059669, #34d399); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-check-circle fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">Diets Delivered</div>
            <div class="fs-3 fw-bold">{{ stats.todayDietDelivered }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card h-100 kpi-card border-0" (click)="go('/diet-supervisor')" role="button" style="background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff;">
          <div class="card-body text-center py-3">
            <i class="bi bi-x-circle fs-4 d-block mb-1" style="opacity:.8"></i>
            <div class="small mb-1" style="opacity:.8">Diets Cancelled</div>
            <div class="fs-3 fw-bold">{{ stats.todayDietCancelled }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <!-- Today's Diet Progress -->
      <div class="col-lg-8">
        <div class="card h-100" *ngIf="!loading && stats.todayDietPending + stats.todayDietDelivered + stats.todayDietCancelled > 0">
          <div class="card-header d-flex align-items-center gap-2"><i class="bi bi-graph-up" style="color: var(--uf-primary);"></i><h6 class="mb-0">Today's Diet Progress</h6></div>
          <div class="card-body">
            <div class="progress" style="height: 32px; border-radius: 50px;">
              <div class="progress-bar" role="progressbar"
                style="background: linear-gradient(90deg, #059669, #10b981);"
                [style.width.%]="dietPercent('delivered')"
                [attr.aria-valuenow]="stats.todayDietDelivered">
                <i class="bi bi-check-circle me-1"></i>{{ stats.todayDietDelivered }} Delivered
              </div>
              <div class="progress-bar" role="progressbar"
                style="background: linear-gradient(90deg, #d97706, #f59e0b); color: #1e293b;"
                [style.width.%]="dietPercent('pending')"
                [attr.aria-valuenow]="stats.todayDietPending">
                <i class="bi bi-hourglass-split me-1"></i>{{ stats.todayDietPending }} Pending
              </div>
              <div class="progress-bar" role="progressbar"
                style="background: linear-gradient(90deg, #dc2626, #ef4444);"
                [style.width.%]="dietPercent('cancelled')"
                [attr.aria-valuenow]="stats.todayDietCancelled">
                <i class="bi bi-x-circle me-1"></i>{{ stats.todayDietCancelled }} Cancelled
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header d-flex align-items-center gap-2"><i class="bi bi-lightning-charge" style="color: var(--uf-warning);"></i><h6 class="mb-0">Quick Actions</h6></div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <button class="btn btn-primary" (click)="go('/patients/new')" *ngIf="canCreate"><i class="bi bi-person-plus me-1"></i>New Patient</button>
              <button class="btn btn-outline-primary" (click)="go('/patients')"><i class="bi bi-people me-1"></i>View Patients</button>
              <button class="btn btn-outline-primary" (click)="go('/diet-supervisor')"><i class="bi bi-clipboard2-pulse me-1"></i>Diet Supervisor</button>
              <button class="btn btn-outline-primary" (click)="go('/orders')"><i class="bi bi-cart3 me-1"></i>Orders</button>
              <button class="btn btn-outline-secondary" *ngIf="isAdmin" (click)="go('/reports')"><i class="bi bi-bar-chart-line me-1"></i>Reports</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .kpi-card { cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
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
