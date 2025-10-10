import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-deliver-modal',
  template: `
  <div class="modal" tabindex="-1" [class.show]="visible" [style.display]="visible ? 'block' : 'none'">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Confirm Delivery</h5>
          <button type="button" class="btn-close" aria-label="Close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          <p>Mark order #{{orderId}} as delivered?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" (click)="cancel()">Cancel</button>
          <button class="btn btn-primary btn-sm" (click)="confirm()">Yes, mark delivered</button>
        </div>
      </div>
    </div>
  </div>
  `
})
export class ConfirmDeliverModalComponent {
  visible = false;
  @Input() orderId?: string;
  @Output() onConfirm = new EventEmitter<string>();

  open(id?: string) { this.orderId = id; this.visible = true; }
  cancel() { this.visible = false; }
  confirm() { this.visible = false; this.onConfirm.emit(this.orderId); }
}
