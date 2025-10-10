import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patients-list',
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.css']
})
export class PatientsListComponent implements OnInit {
  patients: any[] = [];
  q = '';
  loading = false;

  constructor(private api: ApiService, private router: Router) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    const params: any = {};
    if (this.q) params.q = this.q;
    this.api.get('/patients', params).subscribe((res: any) => {
      this.patients = res || [];
      this.loading = false;
    }, err => {
      this.loading = false;
      console.error('Failed to load patients', err);
    });
  }

  newPatient() {
    this.router.navigate(['/patients/new']);
  }

  open(p: any) {
    this.router.navigate(['/patients', p._id]);
  }
}
