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

- Frontend-only prototype: all data lives in `src/lib/mock-data.ts` and in-memory React context (`src/lib/store.tsx`); no backend, no browser storage — the spec forbids persistence.
- "Today" is the fixed `NOW` constant in mock-data so expiry logic stays deterministic.
- Role-based access: nav visibility in `AppShell` `NAV`, page access via `RoleGate`; keep both in sync.
- App content renders only after hydration (AppShell `mounted`) to avoid timezone-based SSR mismatches.
