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

  <div *ngFor="let o of orders; let oi = index" class="card mb-3">
    <div class="card-body">
      <div class="d-flex align-items-center flex-wrap gap-2">
        <div>
          <h6>Order {{o._id}}</h6>
          <div class="small text-muted">Date: {{ o.date | date:'mediumDate' }}</div>
        </div>
        <div class="ms-auto small text-muted" *ngIf="firstPatient(o)">
          Patient: <strong>{{ firstPatient(o)?.name }}</strong>
          <span *ngIf="firstPatient(o)?.mrn">(MRN: {{ firstPatient(o)?.mrn }})</span>
        </div>
        <div>
          <span class="badge" [ngClass]="{ 'bg-success': isAllDelivered(o), 'bg-secondary': !isAllDelivered(o) }">{{ isAllDelivered(o) ? 'delivered' : 'pending' }}</span>
        </div>
      </div>

      <ng-container *ngFor="let g of groupByMealSlot(o.items)">
        <h6 class="mt-3 mb-2">{{ toTitle(g.slot) }}</h6>
        <ul class="list-group list-group-flush">
          <li class="list-group-item" *ngFor="let it of g.items; let ii = index">
            <div class="d-flex justify-content-between flex-wrap gap-2 align-items-center">
              <div>
                <div><strong>{{it.menuItemId?.name || 'Item'}}</strong></div>
                <div class="small text-muted" *ngIf="it.patientId?.name">
                  {{it.patientId.name}}
                  <span *ngIf="it.patientId.mrn">(MRN: {{it.patientId.mrn}})</span>
                  <span *ngIf="it.patientId.ward || it.patientId.bed"> — {{it.patientId.ward || ''}} {{it.patientId.bed || ''}}</span>
                </div>
                <div class="small" *ngIf="it.notes"><em>{{it.notes}}</em></div>
              </div>
              <div class="d-flex align-items-center gap-2 ms-auto">
                <span class="text-nowrap">x {{it.quantity}}</span>
                <button *ngIf="canDeliver && it.deliveryStatus !== 'delivered'" class="btn btn-sm btn-outline-secondary" (click)="deliverItem(o, it)">Mark delivered</button>
                <span class="badge" [ngClass]="{ 'bg-success': it.deliveryStatus === 'delivered', 'bg-secondary': it.deliveryStatus !== 'delivered' }">{{ it.deliveryStatus || 'pending' }}</span>
              </div>
            </div>
          </li>
        </ul>
      </ng-container>

      <div class="mt-3 d-flex">
        <button *ngIf="canDeliver && !isAllDelivered(o)" class="btn btn-sm btn-secondary ms-auto" (click)="confirmDeliver(o)">Mark all Delivered</button>
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
  refresh() { this.api.get('/orders').subscribe((res: any) => { this.orders = res; }, err => { this.toast.error('Failed to load orders'); console.error(err); }); }

  firstPatient(o: any) { return (o.items || []).find((it:any) => it.patientId && it.patientId.name)?.patientId; }
  isAllDelivered(o: any) { return (o.items || []).length > 0 && (o.items || []).every((it:any) => it.deliveryStatus === 'delivered'); }

  setKitchen(o: any, status: string) {
    this.api.put(`/orders/${o._id}/kitchen-status`, { kitchenStatus: status }).subscribe((res:any)=> { this.toast.success('Updated'); this.refresh(); }, err => { this.toast.error('Failed'); console.error(err); });
  }

  confirmDeliver(o:any) { this.confirmModal.open(o._id); }

  onConfirmedDeliver(event?: any) {
    const id = event ?? this.confirmModal?.orderId;
    if (!id) return;
    this.onConfirmedDeliverHandler(id);
  }
  onConfirmedDeliverHandler(oId: string) { this.api.put(`/orders/${oId}/deliver`, { deliveryStatus: 'delivered' }).subscribe((res:any)=> { this.toast.success('Marked delivered'); this.refresh(); }, err => { this.toast.error('Failed to mark delivered'); console.error(err); }); }

  deliverItem(o:any, it:any) {
    const idx = (o.items || []).indexOf(it);
    if (idx < 0) return;
    this.api.put(`/orders/${o._id}/items/${idx}/deliver`, {}).subscribe((res:any)=> { this.toast.success('Item delivered'); this.refresh(); }, err => { this.toast.error('Failed'); console.error(err); });
  }

  get canKitchen() { return ['kitchen','vendor','admin'].includes(this.api.getUserRole()); }
  get canDeliver() { return ['delivery','admin'].includes(this.api.getUserRole()); }
  get canCreate() { return ['dietician','admin'].includes(this.api.getUserRole()); }

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
