import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Toast {
  id?: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timeout?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts: Toast[] = [];
  private subject = new Subject<Toast[]>();

  getToasts(): Observable<Toast[]> {
    return this.subject.asObservable();
  }

  show(toast: Toast) {
    toast.id = Date.now() + Math.floor(Math.random() * 1000);
    if (toast.timeout === undefined) toast.timeout = 5000;
    this.toasts = [toast, ...this.toasts];
    this.subject.next(this.toasts);

    if (toast.timeout! > 0) {
      setTimeout(() => {
        this.remove(toast.id!);
      }, toast.timeout);
    }
  }

  success(message: string, timeout?: number) { this.show({ type: 'success', message, timeout }); }
  error(message: string, timeout?: number) { this.show({ type: 'error', message, timeout }); }
  info(message: string, timeout?: number) { this.show({ type: 'info', message, timeout }); }
  warning(message: string, timeout?: number) { this.show({ type: 'warning', message, timeout }); }

  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.subject.next(this.toasts);
  }

  clear() {
    this.toasts = [];
    this.subject.next(this.toasts);
  }
}
