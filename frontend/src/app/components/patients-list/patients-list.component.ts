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
    this.api.get('/patients', params).subscribe((res: any) => {
      this.patients = res || [];
      this.loading = false;
    }, err => {
      this.loading = false;
      console.error('Failed to load patients', err);
      this.toast.error('Failed to load patients');
    });
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
      this.toast.success('Patient deleted');
      this.load();
    }, err => { console.error('Delete failed', err); this.toast.error('Delete failed'); });
  }
}
