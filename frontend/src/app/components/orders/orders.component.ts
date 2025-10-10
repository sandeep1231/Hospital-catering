import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDeliverModalComponent } from './confirm-deliver-modal.component';

@Component({
  selector: 'app-orders',
  template: `
  <div class="d-flex mb-3">
    <h4 class="me-auto">Today's Orders</h4>
    <div class="d-flex gap-2">
      <a *ngIf="canCreate" class="btn btn-sm btn-success" routerLink="/orders/new">New Order</a>
      <button class="btn btn-sm btn-primary" (click)="refresh()">Refresh</button>
    </div>
  </div>

  <div *ngFor="let o of orders" class="card mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center">
        <div>
          <h6>Order {{o._id}}</h6>
          <div class="small text-muted">Date: {{ o.date | date:'mediumDate' }}</div>
        </div>
        <div class="ms-auto">
          <span class="badge bg-secondary">{{o.kitchenStatus}}</span>
          <span class="badge bg-info text-dark ms-2">{{o.deliveryStatus}}</span>
        </div>
      </div>

      <ng-container *ngFor="let g of groupByMealSlot(o.items)">
        <h6 class="mt-3 mb-2">{{ toTitle(g.slot) }}</h6>
        <ul class="list-group list-group-flush">
          <li class="list-group-item" *ngFor="let it of g.items">
            <div class="d-flex justify-content-between flex-wrap gap-2">
              <div>
                <div><strong>{{it.menuItemId?.name || 'Item'}}</strong></div>
                <div class="small text-muted" *ngIf="it.patientId?.name">Patient: {{it.patientId.name}}<span *ngIf="it.patientId.ward || it.patientId.bed"> — {{it.patientId.ward || ''}} {{it.patientId.bed || ''}}</span></div>
                <div class="small" *ngIf="it.notes"><em>{{it.notes}}</em></div>
              </div>
              <div class="d-flex align-items-center gap-2 ms-auto">
                <span class="text-nowrap">x {{it.quantity}}</span>
                <button *ngIf="canKitchen" class="btn btn-sm btn-outline-primary" (click)="setKitchen(o,'preparing')">Prepare</button>
                <button *ngIf="canKitchen" class="btn btn-sm btn-outline-success" (click)="setKitchen(o,'ready')">Ready</button>
                <button *ngIf="canKitchen" class="btn btn-sm btn-outline-danger" (click)="setKitchen(o,'cancelled')">Cancel</button>
              </div>
            </div>
          </li>
        </ul>
      </ng-container>

      <div class="mt-3 d-flex">
        <button *ngIf="canDeliver" class="btn btn-sm btn-secondary ms-auto" (click)="confirmDeliver(o)">Mark Delivered</button>
      </div>
    </div>
  </div>

  <app-confirm-deliver-modal (onConfirm)="onConfirmedDeliver($event)"></app-confirm-deliver-modal>
  `
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  @ViewChild(ConfirmDeliverModalComponent) confirmModal!: ConfirmDeliverModalComponent;

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.refresh(); }
  refresh() { this.api.get('/orders').subscribe((res: any) => { this.orders = res; this.toast.info('Loaded orders'); }, err => { this.toast.error('Failed to load orders'); console.error(err); }); }

  setKitchen(o: any, status: string) {
    this.api.put(`/orders/${o._id}/kitchen-status`, { kitchenStatus: status }).subscribe((res:any)=> { this.toast.success('Updated'); this.refresh(); }, err => { this.toast.error('Failed'); console.error(err); });
  }

  confirmDeliver(o:any) { this.confirmModal.open(o._id); }

  // helper to receive modal confirm event (now receives the order id)
  onConfirmedDeliver(event?: any) {
    const id = event ?? this.confirmModal?.orderId;
    if (!id) return;
    this.onConfirmedDeliverHandler(id);
  }
  onConfirmedDeliverHandler(oId: string) { this.api.put(`/orders/${oId}/deliver`, { deliveryStatus: 'delivered' }).subscribe((res:any)=> { this.toast.success('Marked delivered'); this.refresh(); }, err => { this.toast.error('Failed to mark delivered'); console.error(err); }); }

  get canKitchen() { return ['kitchen','vendor','admin'].includes(this.api.getUserRole()); }
  get canDeliver() { return ['delivery','admin'].includes(this.api.getUserRole()); }
  get canCreate() { return ['dietician','admin'].includes(this.api.getUserRole()); }

  // group by meal slot for display
  groupByMealSlot(items: any[]) {
    const buckets: Record<string, any[]> = {};
    for (const it of items || []) {
      const slot = it?.mealSlot || 'other';
      (buckets[slot] ||= []).push(it);
    }
    const order = ['breakfast','lunch','dinner','snack','other'];
    return Object.keys(buckets)
      .sort((a,b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
      .map(slot => ({ slot, items: buckets[slot] }));
  }

  toTitle(s?: string) { if (!s) return 'Other'; return s.charAt(0).toUpperCase() + s.slice(1); }
}
