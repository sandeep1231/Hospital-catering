import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-patients-list',
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.css']
})
export class PatientsListComponent implements OnInit {
  patients: any[] = [];
  q = '';
  loading = false;
  role: string | null = null;
  // paging
  page: number = 1;
  pageSize: number = 20;
  total: number = 0;
  // per-patient mobile history expansion state
  expandedHistory: Record<string, boolean> = {};
  // filters
  status: string = ''; // in_patient | discharged | outpatient | ''(all)
  dietStatus: string = ''; // pending | delivered | cancelled | ''(all)
  roomTypeFilter: string = '';
  roomNoFilter: string = '';
  roomTypes: string[] = [];
  roomNos: string[] = [];

  constructor(private api: ApiService, private router: Router, private toast: ToastService) { }

  ngOnInit(): void {
    this.role = this.api.getUserRole();
    this.fetchMeta();
    this.load();
  }

  fetchMeta() {
    this.api.get('/patients/meta', {}).subscribe((res: any) => {
      this.roomTypes = Array.isArray(res?.roomTypes) ? res.roomTypes : [];
      this.roomNos = Array.isArray(res?.roomNos) ? res.roomNos : [];
    }, err => {
      console.error('Failed to load room meta', err);
      this.roomTypes = [];
      this.roomNos = [];
    });
  }

  onRoomTypeChange() {
    // reset room number when room type changes
    const selected = this.roomTypeFilter;
    this.roomNoFilter = '';
    this.loadRoomNosForType(selected, () => this.load());
  }

  private loadRoomNosForType(roomType: string, then?: () => void) {
    const params: any = roomType ? { roomType } : {};
    this.api.get('/patients/meta/room-nos', params).subscribe((res: any) => {
      this.roomNos = Array.isArray(res?.roomNos) ? res.roomNos : [];
      if (then) then();
    }, err => {
      console.error('Failed to load room numbers for type', err);
      this.roomNos = [];
      if (then) then();
    });
  }

  load() {
    this.loading = true;
    const params: any = {};
    if (this.q) params.q = this.q;
    if (this.status) params.status = this.status;
    if (this.dietStatus) params.dietStatus = this.dietStatus;
    if (this.roomTypeFilter) params.roomType = this.roomTypeFilter;
    if (this.roomNoFilter) params.roomNo = this.roomNoFilter;
    // server-side pagination
    params.page = this.page;
    params.pageSize = this.pageSize;
    this.api.get('/patients', params).subscribe((res: any) => {
      if (res && Array.isArray(res.items)) {
        this.patients = res.items;
        this.total = Number(res.total) || 0;
        this.page = Number(res.page) || this.page;
        this.pageSize = Number(res.pageSize) || this.pageSize;
      } else if (Array.isArray(res)) {
        // fallback if server still returns legacy array
        this.patients = res;
        this.total = res.length;
      } else {
        this.patients = [];
        this.total = 0;
      }
      this.loading = false;
    }, err => {
      this.loading = false;
      console.error('Failed to load patients', err);
      this.toast.error('Failed to load patients');
    });
  }

  totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  canPrev(): boolean { return this.page > 1; }
  canNext(): boolean { return this.page < this.totalPages(); }
  prevPage() { if (!this.canPrev()) return; this.page--; this.load(); }
  nextPage() { if (!this.canNext()) return; this.page++; this.load(); }
  onPageSizeChange(newSize: any) {
    const n = parseInt(String(newSize), 10);
    if (!Number.isNaN(n) && n > 0 && n <= 100) {
      this.pageSize = n; this.page = 1; this.load();
    }
  }

  newPatient() {
    if (this.role === 'dietician') return;
    this.router.navigate(['/patients/new']);
  }

  open(p: any) {
    this.router.navigate(['/patients', p._id]);
  }

  delete(p: any) {
    if (!confirm(`Delete patient "${p.name}"? This will also remove their diet assignments.`)) return;
    this.api.delete('/patients/' + p._id).subscribe(() => {
      this.toast.success('Patient deleted successfully');
      // If current page becomes empty, step back a page when possible
      const wasOnlyItem = this.patients.length === 1 && this.page > 1;
      if (wasOnlyItem) this.page--;
      this.load();
    }, err => { console.error('Delete failed', err); this.toast.error(err?.error?.message || 'Failed to delete patient'); });
  }

  // Helpers for mobile card to avoid showing today's entry inside "Diet (history)"
  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  historyWithoutToday(p: any): any[] {
    if (!p || !Array.isArray(p.dietHistory)) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    return p.dietHistory.filter((h: any) => {
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return true;
      d.setHours(0,0,0,0);
      return !this.isSameDay(d, today);
    });
  }

  // Return history sorted in descending order by date (most recent first)
  sortedHistory(p: any): any[] {
    if (!p || !Array.isArray(p.dietHistory)) return [];
    return [...p.dietHistory].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Movement history sorted by start desc
  sortedMoves(p: any): any[] {
    if (!p || !Array.isArray(p.movementHistory)) return [];
    return [...p.movementHistory].sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }

  isHistoryExpanded(p: any): boolean { return !!this.expandedHistory[p?._id]; }
  toggleHistory(p: any) { if (!p?._id) return; this.expandedHistory[p._id] = !this.expandedHistory[p._id]; }
}
