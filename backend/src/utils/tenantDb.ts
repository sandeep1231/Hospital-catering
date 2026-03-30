import mongoose, { Connection } from 'mongoose';

/**
 * Manages per-vendor MongoDB connections (databases).
 * Each vendor gets its own database: df_v_{vendorId}
 * Connections are cached and reused.
 */
class TenantConnectionManager {
  private connections = new Map<string, Connection>();
  private baseUri: string = '';

  /** Call once at startup with the shared-DB connection URI */
  init(uri: string) {
    // Strip the database name from the URI to get the base.
    // e.g. "mongodb+srv://user:pw@host/dietflow_shared?opt" → base = everything minus the DB name
    this.baseUri = uri;
  }

  /** Get (or create) the Mongoose connection for a vendor */
  getConnection(vendorId: string): Connection {
    const existing = this.connections.get(vendorId);
    if (existing && existing.readyState !== 0 /* disconnected */) {
      return existing;
    }

    const dbName = `df_v_${vendorId}`;
    // useDb() shares the underlying connection pool, so no extra TCP connections are opened.
    const conn = mongoose.connection.useDb(dbName, { useCache: true });
    this.connections.set(vendorId, conn);
    return conn;
  }

  /** Graceful shutdown: close all tenant connections */
  async closeAll() {
    const closing: Promise<void>[] = [];
    for (const [, conn] of this.connections) {
      closing.push(conn.close());
    }
    await Promise.all(closing);
    this.connections.clear();
  }
}

export const tenantManager = new TenantConnectionManager();
