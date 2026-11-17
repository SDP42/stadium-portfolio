# Project documents

Every project has a detailed PDF in [`public/project-docs/`](../public/project-docs): the eleven starters and nine on the bench, twenty in all. On each card, **Read doc** opens the PDF in a new tab and **Download PDF** saves it.

## Format

- A4, 1-inch margins, Times New Roman throughout.
- Body text at 12 pt, justified; tables and captions left or centred for legibility.
- A cover with a facts table: portfolio position, context, team, repository, live demo, commit history, main languages and author.
- Page header with the project name, and numbered pages.

## Sections

1. Overview
2. The problem
3. The solution
4. Approach: the decisions that shaped the project, as numbered steps
5. Key features (table)
6. Architecture: a layered diagram, how a request flows, and the processing pipeline where the project has one
7. Technology stack (table)
8. Data and models
9. Engineering and quality
10. Results at a glance (table, with a chart where the project has real numbers)
11. Repository activity: language mix and commit activity, drawn from the GitHub API
12. Status and next steps, including honest limits

## Sources

Facts come from each repository's README, code layout and commit history, and from the résumé. Three projects have little public source (Stratify has an empty repository, Medical AI has none and HackNova has no README), and their documents say so.

## Updating one

Replace the PDF in `public/project-docs/` with the same file name, so links keep working, and run `npm run check`.
