import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sa-requests',
  template: `
  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1"><i class="bi bi-bell me-2" style="color: var(--uf-primary);"></i>Pending Requests</h4>
        <div class="text-muted small">Review vendor registrations and hospital assignment requests</div>
      </div>
    </div>

    <div *ngIf="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div *ngIf="!loading">
      <!-- Pending Vendor Registrations -->
      <div class="card mb-4">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-shop text-warning"></i>
          <h6 class="mb-0">Pending Vendor Registrations</h6>
          <span class="badge bg-warning text-dark ms-auto" *ngIf="pendingVendors.length">{{ pendingVendors.length }}</span>
        </div>
        <div class="card-body p-0" *ngIf="pendingVendors.length > 0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Vendor</th><th>Contact</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>
              <tr *ngFor="let v of pendingVendors">
                <td>
                  <div class="fw-semibold">{{ v.name }}</div>
                  <div class="small text-muted" *ngIf="v.address">{{ v.address }}</div>
                </td>
                <td>
                  <div class="small">{{ v.contactEmail }}</div>
                  <div class="small text-muted" *ngIf="v.contactPhone">{{ v.contactPhone }}</div>
                </td>
                <td class="small text-muted">{{ v.createdAt | date:'medium' }}</td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-success" (click)="approveVendor(v)"><i class="bi bi-check-lg me-1"></i>Approve</button>
                    <button class="btn btn-danger" (click)="rejectVendor(v)"><i class="bi bi-x-lg me-1"></i>Reject</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-body text-muted text-center" *ngIf="pendingVendors.length === 0">
          <i class="bi bi-check-circle text-success me-1"></i> No pending vendor registrations
        </div>
      </div>

      <!-- Pending Hospital Assignment Requests -->
      <div class="card">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-hospital text-info"></i>
          <h6 class="mb-0">Pending Hospital Assignments</h6>
          <span class="badge bg-info ms-auto" *ngIf="pendingAssignments.length">{{ pendingAssignments.length }}</span>
        </div>
        <div class="card-body p-0" *ngIf="pendingAssignments.length > 0">
          <table class="table table-hover mb-0">
            <thead><tr><th>Vendor</th><th>Hospital</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of pendingAssignments">
                <td>
                  <div class="fw-semibold">{{ a.vendorId?.name }}</div>
                  <div class="small text-muted">{{ a.vendorId?.contactEmail }}</div>
                </td>
                <td>
                  <div class="fw-semibold">{{ a.hospitalId?.name }}</div>
                  <div class="small text-muted">{{ a.hospitalId?.address }}</div>
                </td>
                <td class="small text-muted">{{ a.requestedAt | date:'medium' }}</td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-success" (click)="approveAssignment(a)"><i class="bi bi-check-lg me-1"></i>Approve</button>
                    <button class="btn btn-danger" (click)="rejectAssignment(a)"><i class="bi bi-x-lg me-1"></i>Reject</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-body text-muted text-center" *ngIf="pendingAssignments.length === 0">
          <i class="bi bi-check-circle text-success me-1"></i> No pending hospital assignment requests
        </div>
      </div>
    </div>
  </div>
  `
})
export class SARequestsComponent implements OnInit {
  loading = true;
  pendingVendors: any[] = [];
  pendingAssignments: any[] = [];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    let done = 0;
    const check = () => { done++; if (done >= 2) this.loading = false; };

    this.api.get('/vendors', { status: 'pending' }).subscribe((res: any) => {
      this.pendingVendors = res.vendors || [];
      check();
    }, check);

    this.api.get('/vendor-hospitals', { status: 'requested' }).subscribe((res: any) => {
      this.pendingAssignments = res || [];
      check();
    }, check);
  }

  approveVendor(v: any) {
    this.api.patch('/vendors/' + v._id + '/status', { status: 'approved' }).subscribe(() => {
      this.toast.success('Vendor approved');
      this.loadAll();
    }, (err: any) => { this.toast.error(err?.error?.message || 'Failed'); });
  }

  rejectVendor(v: any) {
    this.api.patch('/vendors/' + v._id + '/status', { status: 'rejected' }).subscribe(() => {
      this.toast.success('Vendor rejected');
      this.loadAll();
    }, (err: any) => { this.toast.error(err?.error?.message || 'Failed'); });
  }

  approveAssignment(a: any) {
    this.api.patch('/vendor-hospitals/' + a._id + '/approve', {}).subscribe(() => {
      this.toast.success('Hospital assignment approved');
      this.loadAll();
    }, (err: any) => { this.toast.error(err?.error?.message || 'Failed'); });
  }

  rejectAssignment(a: any) {
    this.api.patch('/vendor-hospitals/' + a._id + '/reject', {}).subscribe(() => {
      this.toast.success('Hospital assignment rejected');
      this.loadAll();
    }, (err: any) => { this.toast.error(err?.error?.message || 'Failed'); });
  }
}
