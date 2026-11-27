# Security Summary

## Hardening Controls Implemented

1. **Client-Side Build & Source Exposure Prevention**
   - Production Vite builds disable source maps (`sourcemap: false`) and strip `console` and `debugger` statements (`esbuild.drop`) while separating vendor bundles cleanly.
   - Added runtime anti-copy and asset protection deterrence (`initSecurityShield`) preventing drag/context-menu harvesting of `<img>` and `<video>` media and blocking DevTools shortcuts while keeping text inputs, textareas, and recovery codes functional.

2. **Server HTTP Security Headers & Content Security Policy**
   - Configured Helmet in `server.ts` with `xPoweredBy: false`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Resource-Policy: cross-origin`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`, and a scoped `Content-Security-Policy` allowing only trusted Firebase, Google Fonts, and Cloudinary origins while preserving AI Studio iframe compatibility.
   - Production `500` API responses return generic error messages instead of leaking stack/database details.

3. **Input Validation, XSS Sanitization & URL Safety**
   - Upgraded Zod schemas (`postSchema`, `meetingSchema`, `albumSchema`) with `stripHtmlTags` normalization before length checks so HTML/script-only payloads are rejected cleanly with HTTP `400`.
   - Enforced `isSafeUrl` / `isSafeExternalUrl` checks on both server and client to block `javascript:`, `vbscript:`, and `data:text/html` payloads.

4. **Authentication, Access Control & Rate Limiting**
   - Express API endpoints (`/api/posts`, `/api/meetings`) enforce Firebase ID token verification (`requireAuth`), CORS allowlist checks, and separate general (`500 req / 15m`) and auth (`120 req / 15m`) rate limiters.
   - Cloud persistence relies on Firebase Auth + deployed `firestore.rules` restricting writes and private reads to authenticated owners and authorized participants.

---

## PoC Verification

| Check | Target | Expected Outcome | Verification |
| :--- | :--- | :--- | :--- |
| Script Tag Injection | `POST /api/posts` with `<script>alert(1)</script>` | `stripHtmlTags` empties payload and `min(1)` returns HTTP `400` | Verified in `server.ts` `postSchema` transform pipeline |
| Unsafe URL Scheme | `POST /api/posts` or `POST /api/meetings` with `javascript:alert(1)` | `isSafeUrl` rejects payload with HTTP `400` | Verified in `safeUrlField` and `isSafeExternalUrl` |
| Unauthenticated API Call | `GET /api/posts` without Bearer token | `requireAuth` rejects with HTTP `401` | Verified in `src/middleware/auth.ts` |
| Source Map Exposure | `npm run build` (`mode === 'production'`) | Zero `.map` files emitted; `console`/`debugger` stripped | Configured in `vite.config.ts` (`sourcemap: false`) |
| Single Media Playback | Play `<video>` or `<audio>` across Feed/Reels/Stories/Messenger | `VIDEO_PLAY_EVENT` (`bandhan:media-play`) pauses all other `<video>`/`<audio>` elements | Verified in `SmartVideo.tsx`, `StoriesSection.tsx`, `StoryViewerModal.tsx`, `MessengerDock.tsx`, `PostCard.tsx` |
