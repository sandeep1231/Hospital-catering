import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-reports-dashboard',
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.css']
})
export class ReportsDashboardComponent {
  period: 'daily'|'weekly'|'monthly' = 'daily';
  date: string = new Date().toISOString().substring(0,10);
  vendorSummary: any = null;
  // custom range vendor business summary
  rangeFrom: string = '';
  rangeTo: string = '';
  businessRows: Array<{ inDate: string; dischargeDate: string; name: string; phone: string; billAmount: number }>= [];
  businessLoading = false;
  businessTotal = 0;

  patientId = '';
  from = '';
  to = '';

  patientSearch = '';
  patientMatches: any[] = [];
  selectedPatient: any = null;
  private searchTimer: any;

  loading = false;

  constructor(private api: ApiService) {}

  loadSummary() {
    this.loading = true;
    this.api.get('/reports/vendor', { period: this.period, date: this.date }).subscribe({
      next: (res) => { this.vendorSummary = res; this.loading = false; },
      error: (e) => { console.error(e); this.loading = false; }
    });
  }

  searchPatients() {
    const q = this.patientSearch.trim();
    clearTimeout(this.searchTimer);
    if (q.length < 2) { this.patientMatches = []; return; }
    this.searchTimer = setTimeout(() => {
      this.api.get('/patients', { q }).subscribe({
        next: (list: any) => { this.patientMatches = list || []; },
        error: (e) => { console.error(e); }
      });
    }, 200);
  }

  selectPatient(p: any) {
    this.selectedPatient = p;
    this.patientId = p.code || p._id;
    this.patientMatches = [];
    // Only show MRN if a patient code exists; never display ObjectId as MRN
    this.patientSearch = p.code ? `${p.name} — MRN: ${p.code}` : p.name;
  }

  downloadPatientPdf() {
    if (!this.patientId) return;
    const params: any = {};
    if (this.from) params.from = this.from;
    if (this.to) params.to = this.to;
    this.api.getBlob(`/reports/patient/${encodeURIComponent(this.patientId)}/pdf`, params).subscribe({
      next: (resp: any) => {
        const blob = resp.body as Blob;
        const cd = resp.headers?.get ? resp.headers.get('Content-Disposition') : null;
        let filename = 'patient-billing.pdf';
        if (cd) {
          const match = /filename=\"?([^\";]+)\"?/i.exec(cd);
          if (match) filename = match[1];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (e) => { console.error(e); }
    });
  }

  loadBusinessRange() {
    if (!this.rangeFrom || !this.rangeTo) return;
    this.businessLoading = true;
    this.api.get('/reports/vendor/business-range', { from: this.rangeFrom, to: this.rangeTo }).subscribe({
      next: (rows: any) => {
        // normalize dates for display as yyyy-MM-dd
        this.businessRows = (rows || []).map(r => ({
          inDate: (r.inDate ? new Date(r.inDate).toISOString().substring(0,10) : ''),
          dischargeDate: (r.dischargeDate ? new Date(r.dischargeDate).toISOString().substring(0,10) : ''),
          name: r.name || '',
          phone: r.phone || '',
          billAmount: Number(r.billAmount || 0)
        }));
        this.businessTotal = this.businessRows.reduce((sum, r) => sum + (Number(r.billAmount) || 0), 0);
        this.businessLoading = false;
      },
      error: (e) => { console.error(e); this.businessLoading = false; }
    });
  }

  printBusinessRange() {
    // Use default window.print() so it respects browser settings and avoids pop-up blockers.
    // Global @media print CSS ensures only #businessRangeTable is visible when printing.
    const tableEl = document.getElementById('businessRangeTable');
    if (!tableEl) return;
    window.print();
  }
}
