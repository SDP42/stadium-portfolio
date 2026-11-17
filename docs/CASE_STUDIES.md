# Case studies

Every project has a Word dossier in [`public/case-studies/`](../public/case-studies), downloadable from its card. There are twenty: the eleven starters and nine on the bench.

## Format

- A4, 1-inch margins, Times New Roman throughout.
- Body text at 12 pt, justified; tables and captions left or centred for legibility.
- A cover with a facts table: portfolio position, context, team, repository, live demo, commit history, main languages and author.
- Page header with the project name, and numbered pages.

## Sections

1. Overview
2. The problem
3. The solution
4. Key features (table)
5. Architecture: a layered diagram, how a request flows, and the processing pipeline where the project has one
6. Technology stack (table)
7. Data and models
8. Engineering and quality
9. Results at a glance (table, with a chart where the project has real numbers)
10. Repository activity: language mix and commit activity, drawn from the GitHub API
11. Status and next steps, including honest limits

## Sources

Facts come from each repository's README, code layout and commit history, and from the résumé. Three projects have little public source (Stratify has an empty repository, Medical AI has none and HackNova has no README), and their documents say so.

## Updating one

Replace the file in `public/case-studies/` with the same name, so links keep working, and run `npm run check`.
