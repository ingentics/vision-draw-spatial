# Drawio Spatial

**draw.io compatibility is limited to export** (topic 408): we only need to export to draw.io. Everything else
(behaviours, values, styles, rendering, file details) is free to diverge from draw.io.

@docs/ROADMAP.md

Functional and technical reference: `docs/SPEC.md` (read on demand, not preloaded: 135 KB). Architecture and
"where to look" table: `docs/SUMMARY.md`. Coding rules: `.claude/rules/coding.md` (auto-loaded when touching
`src/` or `tests/`).

**Language:** identifiers in English; code comments, project docs, tickets and commit messages in French. Only the
agent instruction files (this one, `docs/ROADMAP.md`, `.claude/rules/`) are in English.

## Work rules

- **Shared server.** During dev there is a single hot-reload server: the user's `make dev` (port 5173), which they
  watch in their browser. Check results by eye there (`curl localhost:5173` to see if it runs); never start another
  one. If it is down, start `make dev` (default compose project, port 5173) in the background so that it becomes the
  shared server. An engine change reloads the page restoring file, page and camera (plugin `engineFullReload` in
  `vite.config.ts`, `src/app/tabSession.ts`): keep that restoration working. After moving a file, Vite may keep the
  old path cached (blank page): touch the files importing it.
- **Everything runs in Docker** (Node pinned by the image): use `make`, never host `npx`.
- **Validate:**
  - By eye in the app, on the shared server, with a fixture showing the case. Say what was only checked by tests.
  - draw.io is only an **export target** (topic 408): the exported file must open in draw.io, nothing more. Tickets
    need not match draw.io (values, styles, behaviours, rendering) nor be checked in draw.io; `make drawio-check` is
    optional, run it only when a change may break opening the export in draw.io.
  - `make check` (lint, types, format, tests) with `COMPOSE_PROJECT_NAME=drawio-claude` (so the user's container is
    not replaced), must exit 0 before any commit: get its exit code and only run `git commit` if it is 0 — never
    `make check ; git commit`.
- **Commit only after the user validates the ticket.** Finish → `make check` → report and stop. Back-and-forth
  before that validation amends the same ticket. Stage files one by one (`git add path`), never `git add .` or a
  whole directory: files modified by the user stay out of the commit (check `git status`). Pushes are manual.
- **Commit messages: Conventional Commits.** `type(scope): description`, description in French, imperative or
  nominal, no final period. Types: `feat`, `fix`, `docs` (documentation, backlogs), `refactor`, `perf`, `test`,
  `style` (formatting only), `build` (Docker, Makefile, dependencies), `chore` (the rest). Optional scope: the part
  of the app (`engine`, `app`, `palette`, `drawio`, `rdd`…). A breaking change takes `!` (`feat(engine)!: …`) and a
  `BREAKING CHANGE: …` footer. Ticket number in the footer: `Sujet : 49`.
- **Debt seen in passing** is not fixed in the current ticket unless it needs it: write it in `docs/backlogs/debt/`
  (one line, next number) and tell the user.
