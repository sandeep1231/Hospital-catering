import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-diet-supervisor',
  templateUrl: './diet-supervisor.component.html',
  styleUrls: ['./diet-supervisor.component.css']
})
export class DietSupervisorComponent implements OnInit {
  assignments: any[] = [];
  loading = false;
  // filters
  date: string = '';
  roomType: string = '';
  roomNo: string = '';
  q: string = '';
  delivering: Record<string, boolean> = {};
  view: any[] = [];
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit(): void {
    // set local today as default date (avoid UTC shift)
    this.date = this.getLocalDateString(new Date());
    this.load();
  }

  private getLocalDateString(d: Date): string {
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - tzOffsetMs);
    return local.toISOString().slice(0, 10);
  }
  load() {
    this.loading = true;
    const params: any = { date: this.date };
    if (this.roomType) params.roomType = this.roomType;
    if (this.roomNo) params.roomNo = this.roomNo;
    this.api.get('/reports/diet-supervisor/today', params).subscribe((res:any) => {
      this.assignments = res;
      this.applyQuickFilter();
      this.loading = false;
    }, err => { console.error(err); this.toast.error('Failed to load list'); this.loading = false; });
  }
  markDelivered(a: any) {
    if (!confirm('Mark this assignment as delivered?')) return;
    const id = a._id || a.id; // reports provide id
    if (!id) { alert('Missing assignment id'); return; }
    this.delivering[id] = true;
    this.api.post(`/diet-assignments/${id}/deliver`, {}).subscribe((res:any) => {
      this.delivering[id] = false;
      // Optimistically update status in both assignments and view
      a.status = 'delivered';
      const idx = this.assignments.findIndex(x => (x._id||x.id) === id);
      if (idx >= 0) this.assignments[idx].status = 'delivered';
      this.applyQuickFilter();
      this.toast.success('Marked as delivered');
    }, err => { console.error(err); this.toast.error('Failed to mark delivered'); this.delivering[id] = false; });
  }

  applyQuickFilter() {
    const term = (this.q || '').toLowerCase().trim();
    if (!term) { this.view = this.assignments.slice(); return; }
    this.view = this.assignments.filter(a => {
      const name = String(a.patientName || '').toLowerCase();
      const phone = String(a.phone || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }

  generateToday() {
    if (!confirm("Generate today's assignments for all in-patients with a diet?")) return;
    this.loading = true;
    this.api.post('/diet-assignments/generate-today', {}).subscribe((res:any) => {
      this.toast.success('Generated today\'s list');
      this.load();
    }, err => {
      console.error(err);
      this.toast.error('Failed to generate');
      this.loading = false;
    });
  }
}
