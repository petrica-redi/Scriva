# What Cursor Already Did vs What's Left

## DONE (verified in code)
- [x] AI triple fallback — provider.ts has Claude → OpenAI → Gemini ✅
- [x] Google OAuth — signin/signup have handleGoogleSignIn, callback route exists ✅
- [x] Admin users API — /api/admin/users with role check, pagination, search ✅
- [x] Admin users tab — adminUsers state, userSearch, userRoleFilter in admin page ✅
- [x] OAuth user profile sync — migration creates public.users row for Google signups ✅
- [x] STT partial fallback — REST API has Deepgram → nova-2 → OpenAI Whisper ✅

## STILL NEEDED (feed these prompts 1-7 to Cursor in order)
1. STT: Upgrade Whisper to gpt-4o-mini-transcribe + add Google Cloud STT 3rd fallback
2. STT: Local audio backup in browser (IndexedDB) — never lose a recording
3. STT: WebSocket streaming fallback when Deepgram WS dies mid-recording
4. Recording UX simplification for doctors
5. RLS policies on all tables (none exist yet)
6. Admin middleware guard (currently only API-level, not route-level)
7. Opus 4.6 review prompt (run last)
