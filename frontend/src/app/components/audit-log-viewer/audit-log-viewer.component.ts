import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-audit-log-viewer',
  template: `
  <div class="container mt-3">
    <h4 class="mb-3">Audit Logs</h4>

    <!-- Filters -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-6 col-md-3">
            <label class="form-label">Entity</label>
            <select class="form-select" [(ngModel)]="filterEntity" (change)="page=1; load()">
              <option value="">All</option>
              <option *ngFor="let e of entities" [value]="e">{{ e }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Action</label>
            <input class="form-control" [(ngModel)]="filterAction" placeholder="e.g. create, update" (keyup.enter)="page=1; load()" />
          </div>
          <div class="col-6 col-md-3">
            <button class="btn btn-primary" (click)="page=1; load()">Filter</button>
            <button class="btn btn-outline-secondary ms-1" (click)="filterEntity=''; filterAction=''; page=1; load()">Reset</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Empty state -->
    <div *ngIf="!loading && items.length === 0" class="alert alert-light">No audit logs found</div>

    <!-- Table -->
    <div class="card" *ngIf="!loading && items.length > 0">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entity</th>
                <th>Action</th>
                <th>User</th>
                <th>Entity ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of items">
                <td class="text-nowrap small">{{ log.timestamp | date:'dd-MM-yyyy HH:mm:ss':'Asia/Kolkata' }}</td>
                <td><span class="badge bg-secondary">{{ log.entity }}</span></td>
                <td>{{ log.action }}</td>
                <td class="small">{{ log.userId?.name || log.userId?.email || '—' }}</td>
                <td class="small text-muted text-truncate" style="max-width: 120px;" [title]="log.entityId">{{ log.entityId }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" (click)="toggleDetails(log)">
                    {{ log._showDetails ? 'Hide' : 'Show' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-between align-items-center">
        <div class="small text-muted">
          Showing {{ ((page-1)*pageSize + 1) }}–{{ Math.min(page*pageSize, total) }} of {{ total }}
        </div>
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm w-auto" [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="10">10</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option>
          </select>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-secondary" (click)="prevPage()" [disabled]="page <= 1">Prev</button>
            <button class="btn btn-sm btn-outline-secondary" (click)="nextPage()" [disabled]="page >= totalPages()">Next</button>
          </div>
          <div class="small text-muted">Page {{ page }} / {{ totalPages() }}</div>
        </div>
      </div>
    </div>

    <!-- Details modal -->
    <div *ngIf="selectedLog" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.3);">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">{{ selectedLog.entity }} — {{ selectedLog.action }}</h6>
            <button class="btn-close" (click)="selectedLog=null"></button>
          </div>
          <div class="modal-body">
            <pre class="bg-light p-3 rounded small" style="max-height: 400px; overflow: auto;">{{ selectedLog.details | json }}</pre>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-secondary" (click)="selectedLog=null">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
})
export class AuditLogViewerComponent implements OnInit {
  items: any[] = [];
  entities: string[] = [];
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  filterEntity = '';
  filterAction = '';
  selectedLog: any = null;
  Math = Math;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadEntities();
    this.load();
  }

  loadEntities() {
    this.api.get('/audit-logs/entities').subscribe((res: any) => {
      this.entities = Array.isArray(res) ? res : [];
    });
  }

  load() {
    this.loading = true;
    const params: any = { page: this.page, pageSize: this.pageSize };
    if (this.filterEntity) params.entity = this.filterEntity;
    if (this.filterAction) params.action = this.filterAction;
    this.api.get('/audit-logs', params).subscribe((res: any) => {
      this.items = (res.items || []).map((i: any) => ({ ...i, _showDetails: false }));
      this.total = res.total || 0;
      this.loading = false;
    }, () => { this.loading = false; this.toast.error('Failed to load audit logs'); });
  }

  toggleDetails(log: any) {
    if (log._showDetails) {
      log._showDetails = false;
      this.selectedLog = null;
    } else {
      this.items.forEach(i => i._showDetails = false);
      log._showDetails = true;
      this.selectedLog = log;
    }
  }

  totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages()) { this.page++; this.load(); } }
  onPageSizeChange(n: any) {
    const val = parseInt(String(n), 10);
    if (!isNaN(val) && val > 0 && val <= 100) { this.pageSize = val; this.page = 1; this.load(); }
  }
}
