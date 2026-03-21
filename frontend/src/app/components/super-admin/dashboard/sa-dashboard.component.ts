import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sa-dashboard',
  template: `
  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1"><i class="bi bi-speedometer2 me-2" style="color: var(--uf-primary);"></i>Super Admin Dashboard</h4>
        <div class="text-muted small">Platform Overview</div>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div *ngIf="!loading">
      <!-- KPI Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card h-100 border-0 kpi-card" (click)="go('/super-admin/vendors')" role="button"
               style="background: linear-gradient(135deg, #0d9488, #10b981); color: #fff;">
            <div class="card-body text-center py-3">
              <i class="bi bi-shop fs-4 d-block mb-1" style="opacity:.8"></i>
              <div class="small mb-1" style="opacity:.8">Total Vendors</div>
              <div class="fs-3 fw-bold">{{ stats.totalVendors }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100 border-0 kpi-card" (click)="go('/super-admin/vendors?status=pending')" role="button"
               style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff;">
            <div class="card-body text-center py-3">
              <i class="bi bi-hourglass-split fs-4 d-block mb-1" style="opacity:.8"></i>
              <div class="small mb-1" style="opacity:.8">Pending Vendors</div>
              <div class="fs-3 fw-bold">{{ stats.pendingVendors }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100 border-0 kpi-card" (click)="go('/super-admin/hospitals')" role="button"
               style="background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff;">
            <div class="card-body text-center py-3">
              <i class="bi bi-hospital fs-4 d-block mb-1" style="opacity:.8"></i>
              <div class="small mb-1" style="opacity:.8">Total Hospitals</div>
              <div class="fs-3 fw-bold">{{ stats.totalHospitals }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100 border-0 kpi-card" (click)="go('/super-admin/requests')" role="button"
               style="background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff;">
            <div class="card-body text-center py-3">
              <i class="bi bi-bell fs-4 d-block mb-1" style="opacity:.8"></i>
              <div class="small mb-1" style="opacity:.8">Pending Requests</div>
              <div class="fs-3 fw-bold">{{ stats.pendingRequests }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Secondary stats -->
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <i class="bi bi-check-circle text-success fs-4"></i>
              <div class="small text-muted mt-1">Approved Vendors</div>
              <div class="fs-4 fw-bold">{{ stats.approvedVendors }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <i class="bi bi-link-45deg text-primary fs-4"></i>
              <div class="small text-muted mt-1">Active Assignments</div>
              <div class="fs-4 fw-bold">{{ stats.totalAssignments }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body text-center">
              <i class="bi bi-people text-info fs-4"></i>
              <div class="small text-muted mt-1">Total Users</div>
              <div class="fs-4 fw-bold">{{ stats.totalUsers }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-lightning-charge" style="color: var(--uf-warning);"></i>
          <h6 class="mb-0">Quick Actions</h6>
        </div>
        <div class="card-body">
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-primary" (click)="go('/super-admin/vendors?status=pending')"><i class="bi bi-shop me-1"></i>Review Vendors</button>
            <button class="btn btn-outline-primary" (click)="go('/super-admin/requests')"><i class="bi bi-bell me-1"></i>Review Requests</button>
            <button class="btn btn-outline-primary" (click)="go('/super-admin/hospitals')"><i class="bi bi-hospital me-1"></i>Manage Hospitals</button>
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
export class SADashboardComponent implements OnInit {
  loading = true;
  stats: any = {};

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.get('/super-admin/stats').subscribe((res: any) => {
      this.stats = res;
      this.loading = false;
    }, () => { this.loading = false; });
  }

  go(path: string) { this.router.navigateByUrl(path); }
}
