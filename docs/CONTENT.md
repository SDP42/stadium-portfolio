# Editing content

All content lives in [`src/data.js`](../src/data.js). Run `npm run check` after any change: it fails if a rule below is broken, and CI runs it on every push.

## Starting XI (`squad`)

Exactly eleven players with unique shirt numbers. Each needs:

| Field | Rule |
|---|---|
| `no`, `pos`, `posName`, `at` | Shirt number, position, position name and home spot on the pitch (x, z in metres) |
| `title`, `repo`, `live` | Name, GitHub URL and optional live demo |
| `commits`, `event` | Commit count and where it was built |
| `tagline` | 55–68 characters |
| `about` | 180–200 characters |
| `points` | Three highlights, 52–70 characters each |
| `stack` | Technology tags |
| `captain` | `true` on exactly one featured project, which also takes `subtitle`, `numbers` and `deep` |

The length ranges keep every card the same shape; the shirt numbers follow a 4-3-3 and the tour visits them in array order, from keeper to striker.

## Bench (`bench`)

Each entry has `title`, `tagline` (76–88 characters), `stack` and an optional `repo` (with `linkLabel` for a non-GitHub link).

## Case studies

`CASE_STUDIES` maps every squad and bench title to a Word file in `public/case-studies/`. The check fails if a project has no mapping or the file is missing.

## Adding a project

1. Add the entry to `squad` or `bench` with the fields above.
2. Add its case study to `public/case-studies/` and to `CASE_STUDIES`.
3. Run `npm run check`, then `npm run dev` to see the card.

## Everything else

`profile`, `education`, `honours`, `roles`, `interests` and `skills` feed the About, Honours and Skills panels. The résumé is `public/resume/Swayam_Panchal_Resume.pdf`.
