<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Auth: Supabase email/password via the browser client (publishable key only). Session + profile live in `src/lib/auth.tsx` (single onAuthStateChange listener) — one source of truth for identity.
- Role comes from `profiles.role` (mapped to the app's Role in `src/lib/store.tsx`); users cannot write their own role (column-level grants) to prevent privilege escalation.
- App pages live under `src/routes/_authenticated/` (client-only gate redirects to /signin); public pages are `/`, `/signin`, `/signup`.
- Operational data (units, requests, staff) is still mock: `src/lib/mock-data.ts` + in-memory context in `src/lib/store.tsx`, no browser storage.
- "Today" is the fixed `NOW` constant in mock-data so expiry logic stays deterministic.
- Role-based access: nav visibility in `AppShell` `NAV`, page access via `RoleGate`; keep both in sync.
- App content renders only after hydration (AppShell `mounted`) to avoid timezone-based SSR mismatches.
