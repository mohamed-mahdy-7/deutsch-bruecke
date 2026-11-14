# Sync test — two devices

## Prerequisites
1. Apply migrations 001–006 in Supabase (in order).
2. Deploy the web app to Vercel (or run `npm run preview`).
3. Sign in with the same account on two browsers/devices (A and B).

## Test 1 — live data sync
1. On device A, open the tutor and send a message (or add a vocab card).
2. Within ~10 seconds, device B should show the new conversation/card without a manual refresh.
3. The sync indicator should read "synced" on both devices and show a recent timestamp.

## Test 2 — offline then reconnect
1. Put device A offline (airplane mode).
2. Make a change on A (e.g. add a vocab card). The indicator shows "offline"/"error".
3. Bring A back online. Within 60 seconds the change appears on B.

## Test 3 — app update without clearing data
1. Deploy a new build (change any visible string).
2. On a device running the old build, wait up to 15 minutes (or focus the tab).
3. A banner "فيه نسخة جديدة، حدّث دلوقتي / New version available, update" appears.
4. Click update — the app reloads to the new version and the footer shows the new commit hash.
5. No browsing data needs to be cleared.

## Notes
- Realtime requires the `supabase_realtime` publication to include the synced tables (migration 006).
- If Realtime is unavailable, the app falls back to polling every 60s while visible.
