import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manual-order',
  templateUrl: './manual-order.component.html',
  styleUrls: ['./manual-order.component.css']
})
export class ManualOrderComponent implements OnInit {
  date: string = new Date().toISOString().substring(0,10);
  items: Array<{ patientId: string; menuItemId: string; quantity: number; notes?: string }>= [];
  patients: any[] = [];
  menu: any[] = [];

  constructor(private api: ApiService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.api.get('/patients').subscribe((res:any)=> this.patients = res || []);
    this.api.get('/menu').subscribe((res:any)=> this.menu = res || []);
    this.addItem();
  }

  addItem() { this.items.push({ patientId: '', menuItemId: '', quantity: 1, notes: '' }); }
  removeItem(i: number) { this.items.splice(i,1); }

  save(e: Event) {
    e.preventDefault();
    const payload = { date: this.date, items: this.items.filter(it => it.patientId && it.menuItemId && it.quantity>0) };
    if (payload.items.length === 0) { this.toast.error('Add at least one item'); return; }
    this.api.post('/orders', payload).subscribe((res:any)=> { this.toast.success('Order created'); this.router.navigate(['/orders']); }, err => { this.toast.error(err?.error?.message || 'Failed'); console.error(err); });
  }
}
