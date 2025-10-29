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
  // pagination
  page: number = 1;
  pageSize: number = 20;
  // Diet totals modal
  showTotals = false;
  dietTotals: Array<{ name: string; count: number }> = [];
  // Live badges under toolbar
  badgeTotals: Array<{ name: string; count: number }> = [];
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
  this.recomputeTotals();
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
    if (!term) { this.view = this.assignments.slice(); this.page = 1; return; }
    this.view = this.assignments.filter(a => {
      const name = String(a.patientName || '').toLowerCase();
      const phone = String(a.phone || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
    this.page = 1;
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

  // Build totals by diet (case-insensitive), based on the currently loaded list
  private buildDietTotals() {
    const map: Record<string, { name: string; count: number }> = {};
    for (const a of this.assignments) {
      const raw = String(a.diet || 'Unknown').trim();
      const key = raw.toLowerCase();
      const display = raw ? this.titleCase(raw) : 'Unknown';
      if (!map[key]) map[key] = { name: display, count: 0 };
      map[key].count += 1;
    }
    this.dietTotals = Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  // Recompute badge totals (same as dietTotals but stored separately so modal sorting doesn't interfere)
  private recomputeTotals() {
    const map: Record<string, { name: string; count: number }> = {};
    for (const a of this.assignments) {
      const raw = String(a.diet || 'Unknown').trim();
      const key = raw.toLowerCase();
      const display = raw ? this.titleCase(raw) : 'Unknown';
      if (!map[key]) map[key] = { name: display, count: 0 };
      map[key].count += 1;
    }
    this.badgeTotals = Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  private titleCase(s: string) {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  openTotals() {
    // Ensure we are showing totals for the currently selected date (already loaded into assignments)
    this.buildDietTotals();
    this.showTotals = true;
  }

  closeTotals() { this.showTotals = false; }

  // pagination helpers
  get total(): number { return this.view.length; }
  totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  canPrev(): boolean { return this.page > 1; }
  canNext(): boolean { return this.page < this.totalPages(); }
  prevPage() { if (this.canPrev()) this.page--; }
  nextPage() { if (this.canNext()) this.page++; }
  onPageSizeChange(n: any) {
    const val = parseInt(String(n), 10);
    if (!Number.isNaN(val) && val > 0 && val <= 100) { this.pageSize = val; this.page = 1; }
  }
  paged(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.view.slice(start, start + this.pageSize);
  }
}
