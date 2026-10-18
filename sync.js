// sync.js — local-first store + Supabase sync.
//
// Model: every piece of state is an "item" with a key ("task:2026-11-04-2", "reward:…", "settings"),
// a JSON payload, and a client timestamp (ms). Items are stored locally first (instant, works offline),
// marked "dirty", and pushed to Supabase table vw_items. Newest timestamp wins per item, so editing two
// different tasks on two devices never conflicts. Nothing is ever hard-deleted (a deleted flag is used).

export const LS = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const NS = "vw:v1";
const TABLE = "vw_items";

export class Store {
  constructor() {
    this.uid = "local";
    this.items = new Map(); // key -> {data, ts, deleted}
    this.dirty = new Set();
    this.lastPull = null;
    this.ver = 0;
    this.listeners = new Set();
  }
  _k(s, uid = this.uid) { return `${NS}:${uid}:${s}`; }
  load(uid) {
    this.uid = uid;
    this.items = new Map(Object.entries(LS.get(this._k("items"), {})));
    this.dirty = new Set(LS.get(this._k("dirty"), []));
    this.lastPull = LS.get(this._k("lastpull"), null);
    this.ver++;
    this.emit("load");
  }
  persist() {
    LS.set(this._k("items"), Object.fromEntries(this.items));
    LS.set(this._k("dirty"), [...this.dirty]);
    LS.set(this._k("lastpull"), this.lastPull);
  }
  get(key) { const it = this.items.get(key); return it && !it.deleted ? it.data : undefined; }
  set(key, data) { this._write(key, data, false); }
  del(key) { this._write(key, {}, true); }
  _write(key, data, deleted) {
    const prev = this.items.get(key);
    const ts = Math.max(Date.now(), (prev ? prev.ts : 0) + 1);
    this.items.set(key, { data, ts, deleted });
    this.dirty.add(key);
    this.ver++;
    this.persist();
    this.emit("local", key);
  }
  // Merge rows from the server: remote wins only if strictly newer than what we hold.
  merge(rows) {
    let changed = false;
    for (const r of rows) {
      const ts = Number(r.client_ts);
      const cur = this.items.get(r.key);
      if (!cur || ts > cur.ts) {
        this.items.set(r.key, { data: r.data || {}, ts, deleted: !!r.deleted });
        this.dirty.delete(r.key);
        changed = true;
      }
    }
    if (changed) { this.ver++; this.persist(); this.emit("remote"); }
    return changed;
  }
  keys(prefix) { return [...this.items.keys()].filter((k) => k.startsWith(prefix)); }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, key) { for (const f of this.listeners) { try { f(type, key); } catch (e) { console.error(e); } } }
}

// Statuses: local | synced | syncing | offline | error
export class Sync {
  constructor(store, onStatus) {
    this.store = store;
    this.onStatus = onStatus || (() => {});
    this.client = null;
    this.user = null;
    this.busy = false;
    this.again = false;
    this.retries = 0;
    this.timers = {};
    this.status = { kind: "local", pending: 0, msg: "" };
    this._unsub = null;
    this._handlers = [];
  }
  setStatus(kind, msg = "") {
    this.status = { kind, pending: this.store.dirty.size, msg };
    this.onStatus(this.status);
  }
  async start(client, user) {
    this.stop();
    this.client = client;
    this.user = user;
    this._unsub = this.store.on((type) => {
      if (type === "local") {
        this.setStatus(navigator.onLine ? "syncing" : "offline");
        this.schedule(700);
      }
    });
    const on = (t, fn) => { window.addEventListener(t, fn); this._handlers.push([window, t, fn]); };
    on("online", () => this.syncNow("online"));
    on("offline", () => this.setStatus("offline"));
    const vis = () => { if (!document.hidden) this.syncNow("visible"); };
    document.addEventListener("visibilitychange", vis);
    this._handlers.push([document, "visibilitychange", vis]);
    this.timers.poll = setInterval(() => this.syncNow("poll"), 60000);
    await this.syncNow("startup");
    this.subscribe();
  }
  stop() {
    Object.values(this.timers).forEach((t) => { clearTimeout(t); clearInterval(t); });
    this.timers = {};
    if (this._unsub) this._unsub();
    this._unsub = null;
    for (const [t, ev, fn] of this._handlers) t.removeEventListener(ev, fn);
    this._handlers = [];
    if (this.client && this.channel) { try { this.client.removeChannel(this.channel); } catch { /* ignore */ } }
    this.channel = null;
    this.client = null;
    this.user = null;
  }
  schedule(ms) {
    clearTimeout(this.timers.push);
    this.timers.push = setTimeout(() => this.syncNow("edit"), ms);
  }
  async push() {
    const keys = [...this.store.dirty];
    if (!keys.length) return;
    const snap = keys.map((k) => ({ k, rec: this.store.items.get(k) })).filter((x) => x.rec);
    for (let i = 0; i < snap.length; i += 200) {
      const chunk = snap.slice(i, i + 200);
      const rows = chunk.map(({ k, rec }) => ({
        user_id: this.user.id, key: k, data: rec.data, client_ts: rec.ts, deleted: !!rec.deleted,
      }));
      const { error } = await this.client.from(TABLE).upsert(rows, { onConflict: "user_id,key" });
      if (error) throw error;
      // Clear the dirty flag only if the item was not edited again while the request was in flight.
      for (const { k, rec } of chunk) {
        const cur = this.store.items.get(k);
        if (cur && cur.ts === rec.ts) this.store.dirty.delete(k);
      }
      this.store.persist();
    }
    for (const k of keys) if (!this.store.items.has(k)) this.store.dirty.delete(k);
  }
  async pull() {
    const PAGE = 1000;
    const since = this.store.lastPull ? new Date(Date.parse(this.store.lastPull) - 2000).toISOString() : null;
    let from = 0;
    let newest = this.store.lastPull;
    for (;;) {
      let q = this.client.from(TABLE).select("key,data,client_ts,deleted,updated_at")
        .order("updated_at", { ascending: true }).order("key", { ascending: true });
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw error;
      if (data && data.length) {
        this.store.merge(data);
        for (const r of data) if (!newest || r.updated_at > newest) newest = r.updated_at;
      }
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    this.store.lastPull = newest;
    this.store.persist();
  }
  async syncNow(reason = "manual") {
    if (!this.client) { this.setStatus("local"); return; }
    if (!navigator.onLine) { this.setStatus("offline"); return; }
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    this.setStatus("syncing");
    try {
      await this.push();
      await this.pull();
      if (this.store.dirty.size) await this.push();
      this.retries = 0;
      clearTimeout(this.timers.retry);
      this.setStatus(this.store.dirty.size ? "syncing" : "synced");
    } catch (e) {
      console.error("sync failed", reason, e);
      this.retries++;
      const wait = Math.min(60000, 4000 * 2 ** Math.min(this.retries, 4));
      this.setStatus("error", e && e.message ? e.message : String(e));
      clearTimeout(this.timers.retry);
      this.timers.retry = setTimeout(() => this.syncNow("retry"), wait);
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.schedule(300); }
    }
  }
  subscribe() {
    if (!this.client || !this.client.channel) return;
    try {
      this.channel = this.client
        .channel("vw-" + this.user.id)
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${this.user.id}` }, (p) => {
          const r = p && p.new;
          if (r && r.key) { this.store.merge([r]); this.setStatus(this.status.kind === "error" ? "error" : this.store.dirty.size ? "syncing" : "synced"); }
        })
        .subscribe();
    } catch (e) { console.warn("realtime unavailable; polling continues", e); }
  }
}

// ---- Supabase client + auth -------------------------------------------------------------
export function makeClient() {
  const cfg = window.VW_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return { client: null, reason: "config" };
  if (!window.supabase || !window.supabase.createClient) return { client: null, reason: "lib" };
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return { client, reason: "" };
}
