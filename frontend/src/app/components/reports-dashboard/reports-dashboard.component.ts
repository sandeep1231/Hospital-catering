import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reports-dashboard',
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.css']
})
export class ReportsDashboardComponent implements OnInit {
  period: 'daily'|'weekly'|'monthly' = 'daily';
  date: string = new Date().toISOString().substring(0,10);
  vendorSummary: any = null;
  // custom range vendor business summary
  rangeFrom: string = '';
  rangeTo: string = '';
  businessRows: Array<{ inDate: string; dischargeDate: string; name: string; phone?: string; billAmount: number; deliveredCount?: number; dietCounts?: Array<{ name: string; count: number }> }>= [];
  businessLoading = false;
  businessTotal = 0;
  // pagination for business range
  bPage: number = 1;
  bPageSize: number = 20;

  patientId = '';
  from = '';
  to = '';

  patientSearch = '';
  patientMatches: any[] = [];
  selectedPatient: any = null;
  private searchTimer: any;

  loading = false;

  // Analytics controls
  analyticsFrom: string = new Date(Date.now() - 29*86400000).toISOString().substring(0,10);
  analyticsTo: string = new Date().toISOString().substring(0,10);
  analyticsGran: 'daily'|'weekly'|'monthly' = 'daily';
  analyticsStatus: 'delivered' | 'all' | 'pending' | 'cancelled' = 'delivered';

  // ECharts option objects
  optsOverTime: any;
  optsRevenue: any;
  optsRoom: any;
  optsDietDist: any;
  optsPayer: any;

  // Totals/KPIs
  totalDeliveries = 0;
  totalUniquePatients = 0;
  totalRevenue = 0;

  // Revenue chart mode and data caches
  revenueMode: 'daily' | 'cumulative' = 'daily';
  private revLabels: string[] = [];
  private revDaily: number[] = [];
  private revCumulative: number[] = [];

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.loadAnalytics(); }

  // Helpers for ECharts theme/palette
  private palette = ['#3692EB','#FF6384','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF'];
  private pick(i: number) { return this.palette[i % this.palette.length]; }
  private area(color: string) {
    return {
      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [ { offset: 0, color }, { offset: 1, color: this.setAlpha(color, 0.2) } ]
    };
  }
  private setAlpha(hex: string, alpha: number) {
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16), g = parseInt(c.substring(2,4),16), b = parseInt(c.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Build x-axis label config based on label count
  private axisLabelFor(count: number) {
    // thresholds tuned for daily labels; weekly/monthly will have fewer
    if (count > 80) {
      return { show: false };
    } else if (count > 28) {
      return { show: true, hideOverlap: true, interval: 'auto', rotate: 45, margin: 8, showMaxLabel: true, showMinLabel: true };
    } else {
      return { show: true, hideOverlap: true, interval: 'auto', rotate: 0, margin: 10, showMaxLabel: true, showMinLabel: true };
    }
  }

  // Conditionally add dataZoom for dense x-axes
  private dataZoomFor(count: number) {
    if (count > 20) {
      return [
        { type: 'slider', height: 18, bottom: 8, start: 0, end: 100 },
        { type: 'inside' }
      ];
    }
    return [];
  }

  loadSummary() {
    this.loading = true;
    this.api.get('/reports/vendor', { period: this.period, date: this.date }).subscribe({
      next: (res) => { this.vendorSummary = res; this.loading = false; },
      error: (e) => { console.error(e); this.toast.error('Failed to load business summary'); this.loading = false; }
    });
  }

  searchPatients() {
    const q = this.patientSearch.trim();
    clearTimeout(this.searchTimer);
    if (q.length < 2) { this.patientMatches = []; return; }
    this.searchTimer = setTimeout(() => {
    this.api.get('/patients', { q }).subscribe({
      next: (list: any) => { this.patientMatches = list || []; },
      error: (e) => { console.error(e); this.toast.error('Patient search failed'); }
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
      error: (e) => { console.error(e); this.toast.error('Failed to download patient PDF'); }
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
          billAmount: Number(r.billAmount || 0),
          deliveredCount: Number(r.deliveredCount || 0),
          dietCounts: Array.isArray(r.dietCounts) ? r.dietCounts : []
        }));
        this.businessTotal = this.businessRows.reduce((sum, r) => sum + (Number(r.billAmount) || 0), 0);
        this.bPage = 1;
        this.businessLoading = false;
      },
      error: (e) => { console.error(e); this.toast.error('Failed to load business range'); this.businessLoading = false; }
    });
  }

  formatDietCounts(list?: Array<{ name: string; count: number }>): string {
    if (!list || !list.length) return '—';
    return list.map(d => `${d.name}: ${d.count}`).join(' | ');
  }

  printBusinessRange() {
    // Rely on custom print header element so users can disable browser headers/footers.
    // Do not override document.title to avoid duplicated headers when headers are enabled.
    window.print();
  }

  // Business range pagination helpers
  get bCount(): number { return this.businessRows.length; }
  bTotalPages(): number { return Math.max(1, Math.ceil(this.bCount / this.bPageSize)); }
  bCanPrev(): boolean { return this.bPage > 1; }
  bCanNext(): boolean { return this.bPage < this.bTotalPages(); }
  bPrev() { if (this.bCanPrev()) this.bPage--; }
  bNext() { if (this.bCanNext()) this.bPage++; }
  bOnPageSizeChange(n: any) {
    const val = parseInt(String(n), 10);
    if (!Number.isNaN(val) && val > 0 && val <= 200) { this.bPageSize = val; this.bPage = 1; }
  }
  bPagedRows() {
    const start = (this.bPage - 1) * this.bPageSize;
    return this.businessRows.slice(start, start + this.bPageSize);
  }

  loadAnalytics() {
    const params = { from: this.analyticsFrom, to: this.analyticsTo, granularity: this.analyticsGran, status: this.analyticsStatus } as any;
  this.api.get('/reports/analytics', params).subscribe({
      next: (res: any) => {
        const labels: string[] = res.overTime?.labels || [];
        const diets: any[] = res.overTime?.datasets || [];
        const revenue: number[] = res.overTime?.revenue || [];
        const colors = diets.map((_: any, i: number) => this.pick(i));

        // Over Time (stacked bar)
        const overAxisLabel = this.axisLabelFor(labels.length);
        const overDataZoom = this.dataZoomFor(labels.length);
        this.optsOverTime = {
          color: colors,
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
          grid: { left: 64, right: 40, top: 36, bottom: overDataZoom.length ? 80 : 56, containLabel: true },
          xAxis: {
            type: 'category',
            data: labels,
            name: 'Time',
            nameLocation: 'middle',
            nameGap: 32,
            nameRotate: 0,
            axisTick: { alignWithLabel: true },
            boundaryGap: true,
            axisLabel: overAxisLabel,
            nameTextStyle: { fontWeight: 600 }
          },
          yAxis: {
            type: 'value',
            name: 'Deliveries',
            nameLocation: 'middle',
            nameRotate: 90,
            nameGap: 48,
            nameTextStyle: { fontWeight: 600 }
          },
          dataZoom: overDataZoom,
          series: diets.map((ds: any, i: number) => ({
            name: ds.label,
            type: 'bar',
            stack: 'total',
            // Disable dimming other stacks on hover
            emphasis: { focus: 'none' },
            blur: { itemStyle: { opacity: 1 } },
            // Make bars slimmer
            barWidth: 14,
            itemStyle: { borderRadius: [5, 5, 0, 0] },
            data: ds.data
          }))
        };

        // Revenue over time (smooth area line)
        // Prepare revenue data caches and build options via helper
        this.revLabels = labels;
        this.revDaily = (revenue || []).map(v => Number(v || 0));
        this.revCumulative = this.revDaily.reduce((acc: number[], val: number) => {
          acc.push((acc.length ? acc[acc.length - 1] : 0) + (Number(val) || 0));
          return acc;
        }, [] as number[]);
  this.updateRevenueOptions();

        // By room type (stacked bar)
        let roomLabels: string[] = res.byRoomType?.labels || [];
        let roomDatasets: any[] = res.byRoomType?.datasets || [];
        // Filter out room types (categories) whose total across all diets is zero
        if (roomLabels.length && roomDatasets.length) {
          const idxs = roomLabels.map((_, i) => i);
          const keepIdx = idxs.filter(i => roomDatasets.reduce((sum: number, ds: any) => sum + Number((ds?.data?.[i]) || 0), 0) > 0);
          if (keepIdx.length !== roomLabels.length) {
            roomLabels = keepIdx.map(i => roomLabels[i]);
            roomDatasets = roomDatasets.map((ds: any) => ({
              ...ds,
              data: keepIdx.map(i => Number((ds?.data?.[i]) || 0))
            }));
          }
        }
        const roomColors = roomDatasets.map((_: any, i: number) => this.pick(i));
        this.optsRoom = {
          color: roomColors,
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
          grid: { left: 64, right: 40, top: 36, bottom: 56, containLabel: true },
          xAxis: {
            type: 'category',
            data: roomLabels,
            name: 'Room Type',
            nameLocation: 'middle',
            nameGap: 40,
            nameRotate: 0,
            boundaryGap: true,
            axisLabel: { margin: 12 },
            nameTextStyle: { fontWeight: 600 }
          },
          yAxis: {
            type: 'value',
            name: 'Deliveries',
            nameLocation: 'middle',
            nameRotate: 90,
            nameGap: 48,
            nameTextStyle: { fontWeight: 600 }
          },
          series: roomDatasets.map((ds: any, i: number) => ({
            name: ds.label,
            type: 'bar',
            stack: 'room',
            emphasis: { focus: 'none' },
            blur: { itemStyle: { opacity: 1 } },
            barWidth: 14,
            itemStyle: { borderRadius: [5,5,0,0] },
            data: ds.data
          }))
        };

        // Diet distribution (ring)
        const dietLabels: string[] = res.dietDistribution?.labels || [];
        const dietData: number[] = res.dietDistribution?.data || [];
        this.optsDietDist = {
          color: dietLabels.map((_, i) => this.pick(i)),
          tooltip: { trigger: 'item', valueFormatter: (v: any) => Number(v||0).toLocaleString() },
          legend: { bottom: 0 },
          series: [{
            name: 'Diet Distribution', type: 'pie', radius: ['35%', '70%'], center: ['50%', '50%'],
            label: { formatter: '{b}\n{d}%'},
            data: dietLabels.map((n, i) => ({ name: n, value: dietData[i] || 0 }))
          }]
        };

        // Payer mix (ring)
        const payerLabels: string[] = res.payerMix?.labels || [];
        const payerCounts: number[] = res.payerMix?.counts || [];
        this.optsPayer = {
          color: payerLabels.map((_, i) => this.pick(i)),
          tooltip: { trigger: 'item', valueFormatter: (v: any) => Number(v||0).toLocaleString() },
          legend: { bottom: 0 },
          series: [{
            name: 'Payer Mix', type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
            label: { formatter: '{b}\n{d}%'},
            data: payerLabels.map((n, i) => ({ name: n, value: payerCounts[i] || 0 }))
          }]
        };

        // Totals
        this.totalDeliveries = res.totals?.deliveredCount || 0;
        this.totalUniquePatients = res.totals?.uniquePatients || 0;
        this.totalRevenue = res.totals?.revenueTotal || 0;
      },
      error: (e) => { console.error(e); this.toast.error('Failed to load analytics'); }
    });
  }

  // Toggle handler for revenue mode
  setRevenueMode(mode: 'daily' | 'cumulative') {
    if (this.revenueMode !== mode) {
      this.revenueMode = mode;
      this.updateRevenueOptions();
    }
  }

  // Build revenue chart options based on current mode
  private updateRevenueOptions() {
    const revColor = '#28a745';
    const seriesData = this.revenueMode === 'cumulative' ? this.revCumulative : this.revDaily;
    const axisLabelCfg = this.axisLabelFor(this.revLabels.length);
    const dz = this.dataZoomFor(this.revLabels.length);
    this.optsRevenue = {
      color: [revColor],
      tooltip: { trigger: 'axis', valueFormatter: (v: any) => `₹ ${Number(v||0).toLocaleString()}` },
      grid: { left: 64, right: 60, top: 36, bottom: dz.length ? 70 : 46, containLabel: true },
      xAxis: {
        type: 'category',
        data: this.revLabels,
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 28,
        nameRotate: 0,
            boundaryGap: false,
        axisLabel: axisLabelCfg,
        nameTextStyle: { fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        name: 'Revenue',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 48,
        nameTextStyle: { fontWeight: 600 }
      },
      dataZoom: dz,
      series: [{
        name: this.revenueMode === 'cumulative' ? 'Cumulative Revenue' : 'Revenue',
        type: 'line', smooth: true,
        areaStyle: this.area(revColor),
        data: seriesData
      }]
    };
  }
}
