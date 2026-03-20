import { Component, OnInit } from '@angular/core';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index:1200;">
    <div *ngFor="let t of toasts"
         class="toast show mb-2 align-items-center border-0 shadow"
         [ngClass]="'text-bg-' + cls(t.type)"
         role="alert"
         style="min-width: 300px;">
      <div class="d-flex">
        <div class="toast-body">
          <i class="me-1" [ngClass]="{
            'bi bi-check-circle-fill': t.type==='success',
            'bi bi-exclamation-triangle-fill': t.type==='error',
            'bi bi-info-circle-fill': t.type==='info',
            'bi bi-exclamation-circle-fill': t.type==='warning'
          }"></i>
          {{t.message}}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" (click)="close(t.id)"></button>
      </div>
    </div>
  </div>
  `
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];
  constructor(private ts: ToastService) {}
  ngOnInit() { this.ts.getToasts().subscribe(t => this.toasts = t); }
  close(id?: number) { if (!id) return; this.ts.remove(id); }
  cls(t: any) { return t === 'error' ? 'danger' : (t === 'success' ? 'success' : (t === 'warning' ? 'warning' : 'info')); }
}
