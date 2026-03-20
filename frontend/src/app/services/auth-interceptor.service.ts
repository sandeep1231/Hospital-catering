import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private api: ApiService, private toast: ToastService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            this.api.logout();
          } else if (err.status === 403) {
            this.toast.error('Access denied — you do not have permission for this action');
          } else if (err.status >= 500) {
            this.toast.error('Server error — please try again later');
          }
        } else if (err instanceof HttpErrorResponse === false || (err as HttpErrorResponse).status === 0) {
          this.toast.error('Network error — please check your connection');
        }
        return throwError(() => err);
      })
    );
  }
}
