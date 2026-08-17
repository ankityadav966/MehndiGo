// D1 Database helper layer for Cloudflare Workers

export class D1Helper {
  constructor(db) {
    this.db = db;
  }

  // Execute SELECT query returning all matching rows
  async all(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      const res = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      return res.results || [];
    } catch (err) {
      console.error("[D1 ALL ERROR]", query, err);
      throw err;
    }
  }

  // Execute SELECT query returning the first matching row or null
  async first(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      const res = params.length > 0 ? await stmt.bind(...params).first() : await stmt.first();
      return res || null;
    } catch (err) {
      console.error("[D1 FIRST ERROR]", query, err);
      throw err;
    }
  }

  // Execute INSERT, UPDATE, DELETE query returning meta
  async run(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      const res = params.length > 0 ? await stmt.bind(...params).run() : await stmt.run();
      return res;
    } catch (err) {
      console.error("[D1 RUN ERROR]", query, err);
      throw err;
    }
  }

  // Execute multiple statement batch queries
  async batch(statements) {
    try {
      const prepared = statements.map(s => this.db.prepare(s.query).bind(...(s.params || [])));
      return await this.db.batch(prepared);
    } catch (err) {
      console.error("[D1 BATCH ERROR]", err);
      throw err;
    }
  }
}

export function getDb(env) {
  if (!env || !env.DB) {
    throw new Error("D1 database binding 'DB' is not configured or available in environment.");
  }
  return new D1Helper(env.DB);
}
