# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `decision-needed`    | Blocked pending a product decision       |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Why `needs-info` maps to `decision-needed`

This is a solo-maintained repo: there is rarely a third-party reporter to wait on. The blocking state that actually occurs is "a product decision has to be made before any implementation can start" — which `decision-needed` already named before these skills were installed. Reuse it rather than creating a near-duplicate.

## The other label axes

Triage state is orthogonal to the two axes this repo already uses. Don't collapse them:

- **Type**: `bug`, `enhancement`, `tech-debt`, `documentation`, `security`
- **Area**: `ci`, `deploy`, `dependencies`, `performance`, `privacy`
- **Priority**: `nice-to-have`
- **Contributor-facing**: `good first issue`, `help wanted`

An issue normally carries one type label, zero or more area labels, and at most one triage-state label.
