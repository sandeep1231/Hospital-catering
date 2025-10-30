import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({ selector: 'app-admin-diets', templateUrl: './admin-diets.component.html' })
export class AdminDietsComponent implements OnInit {
  diets: any[] = [];
  loading = false;
  editing: any = null;
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load() { this.loading = true; this.api.get('/diets').subscribe((res:any) => { this.diets = res; this.loading = false; }, err => { console.error(err); this.toast.error(err?.error?.message || 'Failed to load diets'); this.loading = false; }); }
  newDiet() { this.editing = { name: '', defaultPrice: 0, active: true }; }
  edit(d:any) { this.editing = { ...d }; }
  cancel() { this.editing = null; }
  save() {
    if (!this.editing) return;
    const payload = { name: this.editing.name, defaultPrice: Number(this.editing.defaultPrice||0), active: !!this.editing.active };
    if (this.editing._id) {
      this.api.put(`/diets/${this.editing._id}`, payload).subscribe(() => { this.toast.success('Diet saved successfully'); this.editing = null; this.load(); }, err => { this.toast.error(err?.error?.message || 'Failed to save diet'); console.error(err); });
    } else {
      this.api.post('/diets', payload).subscribe(() => { this.toast.success('Diet created successfully'); this.editing = null; this.load(); }, err => { this.toast.error(err?.error?.message || 'Failed to create diet'); console.error(err); });
    }
  }
  remove(d:any) { if (!confirm('Delete diet?')) return; this.api.delete(`/diets/${d._id}`).subscribe(() => { this.toast.success('Diet deleted successfully'); this.load(); }, err => { this.toast.error(err?.error?.message || 'Failed to delete diet'); console.error(err); }); }
}
