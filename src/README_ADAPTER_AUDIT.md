# MMS Adapter-Audit (Kurzversion)

**Datum:** 2025-10-23  
**Status:** ❌ Direkte Supabase-Kopplung  
**Gesamtscore:** 4.2/5 (stark gekoppelt)

---

## 🎯 Executive Summary

MMS nutzt **direkt** den Supabase SDK in allen Services. **Kein** Adapter-Pattern vorhanden. Migration zu anderem Backend (Auth0, Convex, Self-Hosted Postgres) erfordert **vollständiges Refactoring** aller Services.

---

## 📊 Kopplungs-Scores

| Bereich | Score | Status |
|---------|-------|--------|
| **DB** | 5/5 | 🔴 Maximal gekoppelt |
| **Auth** | 5/5 | 🔴 Maximal gekoppelt |
| **Storage** | 3/5 | 🟡 Mittel gekoppelt |
| **Realtime** | 0/5 | ✅ Nicht verwendet |
| **Edge Functions** | 2/5 | 🟡 Gering gekoppelt |

### Details

**DB (5/5):**
- Alle Services nutzen `supabase.from()` direkt
- Keine Abstraktionsschicht (Repository/DAO)
- 5 Module betroffen: characters, sessions, projects, marketplace, rulesets

**Auth (5/5):**
- `supabase.auth.getUser()` in 9 Service-Methoden
- Auth-Context nutzt `supabase.auth.*` direkt
- Keine IAuthProvider-Abstraktion

**Storage (3/5):**
- ✅ BFF vorhanden für Upload/Signed URLs
- ❌ Client kennt Supabase-URL hardcoded
- ❌ Kein abstrahierter Storage-Adapter

**Realtime (0/5):**
- Nicht implementiert (gut für Migration!)

**Edge Functions (2/5):**
- Rudimentärer BFF für Storage + RLS-Bypass
- Kein genereller API-Layer

---

## 🚨 Migration-Impact

**Bei Wechsel zu anderem Backend:**

| Ziel-Backend | Aufwand | Risiko | Betroffene Dateien |
|--------------|---------|--------|-------------------|
| **Self-Hosted Supabase** | Niedrig | Niedrig | ENV-Variablen (2 Dateien) |
| **Auth0 + RDS** | Sehr Hoch | Hoch | 15+ Dateien (Auth + Services) |
| **Convex** | Extrem Hoch | Sehr Hoch | 20+ Dateien (komplett anderes Paradigma) |

---

## ✅ Quick Wins (1-2 Tage)

### 1. Auth-Adapter einführen

**Risiko:** Niedrig  
**Betroffene Dateien:** `/lib/auth-context.tsx`, alle Services (9 Dateien)

```typescript
// /lib/adapters/auth/IAuthAdapter.ts
export interface IAuthAdapter {
  getCurrentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

// /lib/adapters/auth/SupabaseAuthAdapter.ts
export class SupabaseAuthAdapter implements IAuthAdapter {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
  // ...
}
```

---

### 2. Storage-URL parametrisieren

**Risiko:** Niedrig  
**Betroffene Dateien:** `/modules/characters/services/character.service.ts`

```typescript
// /lib/config.ts
export const API_CONFIG = {
  storageBaseUrl: import.meta.env.VITE_STORAGE_API_URL || 
    `https://${projectId}.supabase.co/functions/v1`,
};
```

---

## 🔄 Schritt 2 (3-5 Tage)

### 3. DB-Adapter/Repository-Pattern einführen

**Risiko:** Mittel  
**Betroffene Dateien:** 5 Service-Module

```typescript
// /lib/adapters/db/IDbAdapter.ts
export interface IDbAdapter {
  from<T>(table: string): QueryBuilder<T>;
}

// Services nutzen dann:
constructor(private db: IDbAdapter, private auth: IAuthAdapter) {}
```

**Vorteil:** Migration zu Postgres/Convex/etc. erfordert nur Adapter-Austausch.

---

## 🔮 Langfristig (optional)

### 4. BFF für alle DB-Operationen erweitern

**Aufwand:** Hoch (5-10 Tage)  
**Vorteil:** RLS-Logik im Backend, Client DB-agnostisch  
**Nachteil:** Höhere Latenz, mehr Boilerplate

---

### 5. Alternative Provider-Adapter

**Bei Bedarf implementieren:**
- `/lib/adapters/auth/Auth0Adapter.ts`
- `/lib/adapters/db/PostgresAdapter.ts`
- `/lib/adapters/db/ConvexAdapter.ts`

**Voraussetzung:** Schritte 1-3 abgeschlossen.

---

## 📋 Betroffene Dateien (Hauptübersicht)

| Kategorie | Dateien | Supabase-Calls |
|-----------|---------|----------------|
| **Auth** | 10 | `supabase.auth.*` |
| **DB** | 5 Services | `supabase.from()`, `.select()`, `.insert()`, `.update()`, `.delete()` |
| **Storage** | 2 | `fetch()` zu BFF (kennt Supabase-URL) |
| **Config** | 1 | Hardcoded `projectId`, `publicAnonKey` |

### Kritische Dateien

```
/lib/supabase.ts                 ← Supabase Client Init
/lib/auth-context.tsx            ← Auth Context (direkt)
/utils/supabase/info.tsx         ← Hardcoded Config
/modules/*/services/*.service.ts ← Alle Services (5x)
/supabase/functions/server/      ← BFF (2 Dateien)
```

---

## 🎯 Nächste Schritte

### Sofort (diese Woche)

1. ✅ **Adapter-Audit durchgeführt** (dieser Report)
2. ⬜ Entscheidung: Adapter-Einführung JA/NEIN?
3. ⬜ Falls JA → Team-Meeting: Architektur-Diskussion

### Sprint 1 (nächste 2 Wochen)

1. Auth-Adapter implementieren (Schritt 1)
2. Storage-URL parametrisieren (Schritt 2)
3. Unit-Tests für Adapter schreiben

### Sprint 2 (Woche 3-4)

1. DB-Adapter-Interface entwerfen
2. SupabaseDbAdapter implementieren
3. Schrittweise Service-Migration (1 Modul/Tag)

### Langfristig (Q1 2026)

- BFF für DB-Ops erweitern (falls benötigt)
- Alternative Adapter (falls Provider-Wechsel geplant)

---

## 📚 Dokumentation

**Vollständiger Audit-Report:** `ADAPTER_AUDIT_FULL.md` (detaillierte Fundstellen + Code-Beispiele)

**Siehe auch:**
- `ARCHITECTURE.md` – Datenmodell + Features
- `THEME_GUIDE.md` – Corporate Identity
- `SUPABASE_SETUP.md` – Aktuelle DB-Setup-Anleitung

---

**Erstellt:** 2025-10-23  
**Version:** 1.0  
**Autor:** MMS Development Team
