import { TenantModels } from './utils/tenantModels';

declare global {
  namespace Express {
    interface Request {
      tenantModels?: TenantModels;
    }
  }
}

export {};
