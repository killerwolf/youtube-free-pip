# CLAUDE.md

## Git workflow

This repo uses **GitFlow**. `main` is production; `develop` is the integration branch.

### Working an issue

1. Branch from `develop`, one branch per issue:
   ```bash
   git checkout develop && git pull
   git checkout -b <type>/<slug>      # feat/ fix/ test/ chore/ docs/ ci/ refactor/
   ```
2. Open the PR **against `develop`**: `gh pr create --base develop`.
3. Merged into `develop`, the feature is **done** and waits for the next release.

### Releasing

A release is a branch cut from `develop` and merged into `main`. That is the **only** path to `main`, and merging it deploys production via Netlify.

Never open a PR into `main` for a single feature. If work is finished but unreleased, it belongs on `develop`, not in a `develop -> main` PR.

### The one exception

A change with **no issue behind it** that changes **nothing for the user** — CI cleanup, tooling, config, a typo — goes straight to `develop` and is pushed. No branch, no PR.

The discriminator is: **is there an issue behind it?** If yes, branch and PR into `develop`, without exception.

### Commits

Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `ci:`, `refactor:`, `security:`), written in English. Reference issues with `Refs #N`; reserve closing keywords for when every item in the issue is genuinely done.

Issue bodies and PR descriptions are written in **French**, matching the existing tracker.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `killerwolf/youtube-free-pip`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, with `needs-info` mapped onto this repo's existing `decision-needed`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
