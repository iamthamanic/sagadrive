# Debug Report — meshy-avatar-edge-down-false-key

**Date:** 2026-09-18  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** full  

---

## Summary

`sagadrive-edge` was **Exited (137)** after CPU hard-limit / OOM during Meshy avatar jobs. All Edge invokes returned Kong/gateway `500 An unexpected error occurred`. The UI mislabeled that as „Meshy nicht verfügbar“ / „kein API-Key“ while poll health showed „Keine Verbindung“ and progress froze at the last good poll (~59%).  
**Confidence:** high

---

## Fix applied

1. Restarted / recreated `sagadrive-edge` — endpoints again return **401** without JWT (healthy), not 500.
2. `docker-compose.yml`: `restart: unless-stopped` on supabase-edge.
3. Edge main dispatcher: worker `memoryLimitMb` 256 → **512** (GLB materialize headroom).
4. UI: `edgeReachable` + `providersLoadFailed` — „KI-Server nicht erreichbar“ vs „kein API-Key“ getrennt.

## Next for user

Hard-reload Character Editor (`Cmd+Shift+R`). Stuck 59% job may resume via sessionStorage poll once Edge is up.
