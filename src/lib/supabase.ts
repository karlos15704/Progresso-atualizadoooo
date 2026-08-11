import { createClient } from '@supabase/supabase-js';

// VPS Supabase Configuration
const FALLBACK_VPS_URL = 'http://163.176.229.188:8000';
const FALLBACK_VPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// @ts-ignore
const rawEnvUrl = import.meta.env.VITE_SUPABASE_URL;
const rawUrl = (rawEnvUrl && rawEnvUrl !== 'undefined' && rawEnvUrl !== 'null' && rawEnvUrl.trim() !== '') 
  ? rawEnvUrl 
  : FALLBACK_VPS_URL;

// Sanitize URL to remove trailing /rest/v1/ or /rest/v1 if present in user pasted secrets
let supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '');
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = 'http://' + supabaseUrl;
}

// @ts-ignore
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Check if the key contains any secret identifiers or is actually a secret key
const isSecretKey = rawKey && (
  rawKey.toLowerCase().includes('secret') || 
  rawKey.toLowerCase().includes('service_role') || 
  rawKey.startsWith('sb_secret_')
);

// Fallback to VPS anon key if no valid anon key is provided
const supabaseAnonKey = (rawKey && rawKey !== 'undefined' && rawKey !== 'null' && rawKey.trim() !== '' && !isSecretKey) 
  ? rawKey 
  : FALLBACK_VPS_KEY;

// Initialize client if credentials are provided; otherwise use a safe mock client to prevent white screens
let baseSupabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    baseSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        // Provide mock transport to prevent createClient from ever instantiating a browser WebSocket
        transport: function MockWebSocket() {
          return {
            binaryType: "blob",
            close: () => {},
            onclose: () => {},
            onerror: () => {},
            onmessage: () => {},
            onopen: () => {},
            send: () => {},
          };
        } as any,
      }
    });
  } catch (e) {
    console.warn("Error initializing supabase client:", e);
  }
}

const mockRealtimeChannel: any = {
  on: () => mockRealtimeChannel,
  subscribe: (cb?: any) => {
    if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
    return mockRealtimeChannel;
  },
  unsubscribe: () => Promise.resolve("ok"),
};

if (baseSupabase) {
  baseSupabase.channel = () => mockRealtimeChannel;
  baseSupabase.removeChannel = () => Promise.resolve("ok");
  baseSupabase.removeAllChannels = () => Promise.resolve("ok");
}

const realSupabase: any = baseSupabase || {
      auth: {
        onAuthStateChange: (cb: any) => {
          setTimeout(() => cb("SIGNED_OUT", null), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => {},
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase não configurado") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase não configurado") }),
        updateUser: async () => ({ data: { user: null }, error: new Error("Supabase não configurado") }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: new Error("Supabase não configurado") })
          }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") })
          })
        }),
        insert: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") }),
        update: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") }),
        delete: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") }),
      }),
      storage: {
        from: () => ({
          list: () => Promise.resolve({ data: [], error: new Error("Supabase não configurado") }),
          upload: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") }),
          getPublicUrl: () => ({ data: { publicUrl: "" } })
        })
      },
      channel: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe: () => {} })
        })
      }),
      removeChannel: () => {},
    };

export function getSyncQueue(): any[] {
  try {
    const raw = localStorage.getItem("cps_offline_sync_queue");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveSyncQueue(queue: any[]) {
  localStorage.setItem("cps_offline_sync_queue", JSON.stringify(queue));
}

export function addToSyncQueue(item: { table: string, action: 'insert' | 'update' | 'delete', payload?: any, filters?: Record<string, string> }) {
  const queue = getSyncQueue();
  queue.push({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    ...item
  });
  saveSyncQueue(queue);
  
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cps_offline_queue_changed"));
  }
}

export function clearSyncQueue() {
  localStorage.removeItem("cps_offline_sync_queue");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cps_offline_queue_changed"));
  }
}

let isSyncing = false;

export async function syncOfflineQueue() {
  if (isSyncing) return;
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`[Offline Sync] Iniciando sincronização de ${queue.length} operações...`);
  
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cps_sync_status", { detail: { status: "syncing", count: queue.length } }));
  }

  let failedIndex = -1;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      let query = realSupabase.from(item.table);
      let res;
      if (item.action === 'insert') {
        res = await query.insert(item.payload);
      } else if (item.action === 'update') {
        let q = query.update(item.payload);
        for (const key of Object.keys(item.filters || {})) {
          q = q.eq(key, item.filters[key]);
        }
        res = await q;
      } else if (item.action === 'delete') {
        let q = query.delete();
        for (const key of Object.keys(item.filters || {})) {
          if (key.endsWith("_in")) {
            const col = key.slice(0, -3);
            const vals = JSON.parse(item.filters[key]);
            q = q.in(col, vals);
          } else {
            q = q.eq(key, item.filters[key]);
          }
        }
        res = await q;
      }

      if (res && res.error) {
        throw res.error;
      }
      console.log(`[Offline Sync] Operação ${i+1}/${queue.length} sincronizada com sucesso.`);
    } catch (err: any) {
      console.error(`[Offline Sync] Falha ao sincronizar operação ${i+1}:`, err.message);
      failedIndex = i;
      break;
    }
  }

  if (failedIndex === -1) {
    clearSyncQueue();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cps_sync_status", { detail: { status: "success" } }));
    }
  } else {
    const remaining = queue.slice(failedIndex);
    saveSyncQueue(remaining);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cps_sync_status", { detail: { status: "failed", remaining: remaining.length } }));
    }
  }
  isSyncing = false;
}

async function queryOffline(table: string, filters: Record<string, string>, single = false) {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const res = await fetch(`/api/backup/data/${table}?${queryParams}`);
    if (!res.ok) throw new Error("Erro ao carregar dados do backup local");
    let data = await res.json();
    
    // Mesclar com fila local de escritas offline
    const queue = getSyncQueue().filter(item => item.table === table);
    for (const item of queue) {
      if (item.action === 'insert') {
        const record = { id: item.id, ...item.payload };
        data.unshift(record);
      } else if (item.action === 'update') {
        data = data.map((row: any) => {
          const match = Object.keys(item.filters || {}).every(key => String(row[key]) === String(item.filters[key]));
          if (match) {
            return { ...row, ...item.payload };
          }
          return row;
        });
      } else if (item.action === 'delete') {
        data = data.filter((row: any) => {
          const match = Object.keys(item.filters || {}).every(key => {
            if (key.endsWith("_in")) {
              const col = key.slice(0, -3);
              const vals = JSON.parse(item.filters[key]);
              return vals.map(String).includes(String(row[col]));
            }
            return String(row[key]) === String(item.filters[key]);
          });
          return !match;
        });
      }
    }
    
    return { data: single ? (data[0] || null) : data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export const supabase: any = new Proxy({}, {
  get(target, prop: string) {
    const isOffline = typeof window !== "undefined" && localStorage.getItem("cps_offline_mode") === "true";

    if (isOffline) {
      if (prop === "auth") {
        return {
          onAuthStateChange: (cb: any) => {
            const cachedUser = localStorage.getItem("cps_offline_user");
            if (cachedUser) {
              const userObj = JSON.parse(cachedUser);
              setTimeout(() => cb("SIGNED_IN", { user: userObj }), 0);
            } else {
              setTimeout(() => cb("SIGNED_OUT", null), 0);
            }
            return { data: { subscription: { unsubscribe: () => {} } } };
          },
          getSession: async () => {
            const cachedUser = localStorage.getItem("cps_offline_user");
            if (cachedUser) {
              const userObj = JSON.parse(cachedUser);
              return { data: { session: { user: userObj } }, error: null };
            }
            return { data: { session: null }, error: null };
          },
          signOut: async () => {
            localStorage.removeItem("cps_offline_user");
            localStorage.removeItem("cps_offline_mode");
            window.location.reload();
          },
          signInWithPassword: async ({ email }: any) => {
            try {
              const res = await fetch(`/api/backup/offline-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
              });
              if (!res.ok) {
                const errData = await res.json();
                return { data: { user: null, session: null }, error: new Error(errData.error || "Erro no login offline") };
              }
              const data = await res.json();
              localStorage.setItem("cps_offline_user", JSON.stringify(data.user));
              localStorage.setItem("cps_offline_mode", "true");
              setTimeout(() => window.location.reload(), 100);
              return { data: { user: data.user, session: { user: data.user } }, error: null };
            } catch (err: any) {
              return { data: { user: null, session: null }, error: err };
            }
          },
          updateUser: async () => ({ data: { user: null }, error: new Error("Operação indisponível no modo offline.") }),
          signUp: async () => ({ data: { user: null }, error: new Error("Cadastro desabilitado no modo offline.") })
        };
      }

      if (prop === "from") {
        return (table: string) => {
          let filters: Record<string, string> = {};
          
          const chain: any = {
            select: (columns: string) => chain,
            order: (col: string, options: any) => chain,
            limit: (limitVal: number) => chain,
            eq: (col: string, val: any) => {
              filters[col] = val;
              return chain;
            },
            or: (orFilter: string) => {
              filters["_or"] = orFilter;
              return chain;
            },
            maybeSingle: () => {
              return queryOffline(table, filters, true);
            },
            then: (onfulfilled: any) => {
              return queryOffline(table, filters).then(onfulfilled);
            },
            insert: (payload: any) => {
              const payloads = Array.isArray(payload) ? payload : [payload];
              payloads.forEach(p => addToSyncQueue({ table, action: 'insert', payload: p }));
              const insertResult = { data: payload, error: null };
              const insertChain: any = {
                select: () => insertChain,
                single: () => Promise.resolve({ data: payloads[0] || null, error: null }),
                maybeSingle: () => Promise.resolve({ data: payloads[0] || null, error: null }),
                then: (onfulfilled: any, onrejected: any) => Promise.resolve(insertResult).then(onfulfilled, onrejected)
              };
              return insertChain;
            },
            update: (payload: any) => {
              let updateFilters: Record<string, string> = {};
              const updateResult = { data: payload, error: null };
              const updateChain: any = {
                eq: (col: string, val: any) => {
                  updateFilters[col] = val;
                  return updateChain;
                },
                select: () => updateChain,
                single: () => {
                  addToSyncQueue({ table, action: 'update', payload, filters: updateFilters });
                  return Promise.resolve({ data: payload, error: null });
                },
                maybeSingle: () => {
                  addToSyncQueue({ table, action: 'update', payload, filters: updateFilters });
                  return Promise.resolve({ data: payload, error: null });
                },
                then: (onfulfilled: any, onrejected: any) => {
                  addToSyncQueue({ table, action: 'update', payload, filters: updateFilters });
                  return Promise.resolve(updateResult).then(onfulfilled, onrejected);
                }
              };
              return updateChain;
            },
            delete: () => {
              let deleteFilters: Record<string, string> = {};
              const deleteChain: any = {
                eq: (col: string, val: any) => {
                  deleteFilters[col] = val;
                  return deleteChain;
                },
                in: (col: string, vals: any[]) => {
                  deleteFilters[`${col}_in`] = JSON.stringify(vals);
                  return deleteChain;
                },
                then: (onfulfilled: any) => {
                  addToSyncQueue({ table, action: 'delete', filters: deleteFilters });
                  return Promise.resolve({ data: null, error: null }).then(onfulfilled);
                }
              };
              return deleteChain;
            },
            upsert: (payload: any) => {
              const payloads = Array.isArray(payload) ? payload : [payload];
              payloads.forEach(p => addToSyncQueue({ table, action: 'insert', payload: p }));
              return Promise.resolve({ data: payload, error: null });
            }
          };

          return chain;
        };
      }
      
      if (prop === "channel") {
        return () => mockRealtimeChannel;
      }
      
      if (prop === "removeChannel" || prop === "removeAllChannels") {
        return () => Promise.resolve("ok");
      }
    }

    if (prop === "channel") {
      return () => mockRealtimeChannel;
    }
    if (prop === "removeChannel" || prop === "removeAllChannels") {
      return () => Promise.resolve("ok");
    }

    const activeClient = realSupabase;
    const val = activeClient[prop];
    if (typeof val === "function") {
      return val.bind(activeClient);
    }
    return val;
  }
});

// Detecção Automática de Conexão e Monitoramento de Ping
if (typeof window !== "undefined") {
  const checkConnection = async () => {
    const isCurrentlyOffline = localStorage.getItem("cps_offline_mode") === "true";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/health", { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        if (isCurrentlyOffline) {
          console.log("[Connection] Supabase/Backend reestabelecido. Desativando modo offline...");
          localStorage.removeItem("cps_offline_mode");
          window.dispatchEvent(new CustomEvent("cps_offline_status_changed", { detail: { offline: false } }));
          // Tentar sincronizar fila local
          await syncOfflineQueue();
          window.location.reload(); // Recarregar para restabelecer listeners reais
        }
      } else {
        throw new Error("Offline");
      }
    } catch (e) {
      if (!isCurrentlyOffline) {
        console.warn("[Connection] Ping de saúde falhou. Mantendo estado atual sem forçar recarregamento.");
      }
    }
  };

  window.addEventListener("online", checkConnection);
  window.addEventListener("offline", () => {
    console.warn("[Connection] Offline event detected");
  });

  // Verificar a cada 60 segundos
  setInterval(checkConnection, 60000);
}

if (typeof window !== "undefined") {
  const cleanStaleAuth = () => {
    try {
      const lastHeal = localStorage.getItem("cps_last_auth_heal");
      const now = Date.now();
      
      // If we healed in the last 30 seconds, don't loop
      if (lastHeal && now - parseInt(lastHeal) < 30000) {
        console.warn("Preventing possible auth healing loop");
        return;
      }
      
      localStorage.setItem("cps_last_auth_heal", now.toString());

      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (
          key.startsWith("sb-") ||
          key.includes("auth-token") ||
          key === "cps_cached_profile" ||
          key.includes("supabase.auth.token") ||
          key.includes("supabase") ||
          key.includes("auth")
        ) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(
            /=.*/,
            "=;expires=" + new Date().toUTCString() + ";path=/",
          );
      });

      // Force a hard refresh to get a clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (e) {
      console.error("Cleanup error in early auth guard:", e);
    }
  };

  const isAuthError = (msg: string) => {
    const lower = msg.toLowerCase();
    return (
      lower.includes("refresh token") ||
      lower.includes("refresh_token") ||
      lower.includes("refresh token") ||
      lower.includes("refresh_token") ||
      lower.includes("invalid_grant") ||
      lower.includes("jwt expired") ||
      lower.includes("token is expired")
    );
  };

  const handleGlobalRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (!reason) return;
    
    let message = "";
    if (typeof reason === "string") {
      message = reason;
    } else {
      message = reason.message || reason.error_description || reason.error || "";
      if (!message && typeof reason === "object") {
        try {
          message = JSON.stringify(reason);
        } catch (_) {
          message = String(reason);
        }
      }
    }

    if (isAuthError(message)) {
      console.warn("Intercepted and handled Supabase Auth rejection early:", message);
      event.preventDefault(); // Prevent crash / red screen
      event.stopImmediatePropagation();
      cleanStaleAuth();
    }
  };

  const handleGlobalError = (event: ErrorEvent) => {
    const errorDetails = event.error;
    let message = event.message || "";
    if (errorDetails) {
      message = message + " " + (errorDetails.message || errorDetails.error_description || errorDetails.error || String(errorDetails || ""));
    }

    if (isAuthError(message)) {
      console.warn("Intercepted and handled Supabase Auth error early:", message);
      event.preventDefault(); // Prevent crash / red screen
      event.stopImmediatePropagation();
      cleanStaleAuth();
    }
  };

  window.addEventListener("unhandledrejection", handleGlobalRejection, { capture: true });
  window.addEventListener("error", handleGlobalError, { capture: true });
}


