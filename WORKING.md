# Project Working Summary

- Authentication and Identity
  - NextAuth JWT login and credentials: `src/pages/api/auth/[...nextauth].ts:1-37`
  - Session cookie handling for email resolution in APIs

- Notion Integration
  - OAuth connect/disconnect handlers: `src/pages/api/notion/oauth/index.ts`, `src/pages/api/notion/disconnect.ts`
  - List connected pages: `src/pages/api/notion/pages/index.ts:40-56`
  - Page relations (e.g., Quests relation): `src/pages/api/notion/page-relations.ts:12-20,59`
  - Client-side database list/detail/query via tRPC in embed UI: `src/pages/embed/widget.tsx:142-170`, `src/pages/embed/index.tsx:113-141`

- Pomodoro Workflow APIs
  - Start quest work and set relations: `src/pages/api/pomo/quest-start/index.ts`
  - Update quest/task status (start/pause/complete): `src/pages/api/pomo/quest-status/index.ts`, `src/pages/api/pomo/task-status/index.ts`
  - Save tracking entries to Notion: `src/pages/api/pomo/notion-entry/index.ts:63-100`
  - Completed quests summary: `src/pages/api/pomo/completed-quests/index.ts:76-93`

- Embed Widget and Page
  - Widget initialization and user gating: `src/pages/embed/widget.tsx:121-139,220-239`
  - Embed page: saved embeds loading and selections: `src/pages/embed/index.tsx:83-101,111-141`

- Storage
  - SQLite primary storage (embeds/users/notion tokens): `src/utils/serverSide/sqlite.ts:27-46`
  - JSON fallback for embeds when SQLite is unavailable: `src/utils/serverSide/embedsStore.ts:16-56`
  - Legacy JSON migration to SQLite: `src/utils/serverSide/sqlite.ts:93-127`

- Key UI Components
  - Quest selection (relations loader with user gating): `src/Components/QuestSelection/index.tsx:79-121`
  - Tags selection (from database schema): `src/Components/NotionTags`

