import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Global error handler for clearer runtime information during development
window.addEventListener('error', (ev: ErrorEvent) => {
  console.error('Global window error:', ev.message, ev.error, ev.filename, ev.lineno, ev.colno);
});
window.addEventListener('unhandledrejection', (ev: any) => {
  console.error('Unhandled rejection:', ev.reason || ev);
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => {
    console.error('BOOTSTRAP ERROR:', err);
    try { console.error('STACK:', err && err.stack); } catch (e) {}
    try { console.error('ERR JSON:', JSON.stringify(err)); } catch (e) {}
    throw err;
  });
