# Project documents

Every project has a detailed PDF in [`public/project-docs/`](../public/project-docs): the eleven starters and nine on the bench, twenty in all. On each card, **Read doc** opens the PDF in a new tab and **Download PDF** saves it.

## Format

- A4, 1-inch margins, Times New Roman throughout, including tables and command boxes; amounts in rupees are written as INR because Times New Roman has no rupee sign.
- Body text at 12 pt, justified; tables and captions left or centred for legibility.
- A cover with a facts table (portfolio position, context, team, repository, live demo, commit history, main languages and author), then a contents page.
- Page header with the project name, and numbered pages.
- Between 6 and 18 pages, depending on how much public source each project has.

## Sections

Every document follows the same order. Sections a project has no material for are left out, and the rest are renumbered.

1. Executive summary
2. Background and motivation
3. Problem statement, with who is affected
4. Objectives and scope: objectives, in scope and out of scope
5. Solution overview
6. Approach and methodology: each decision with what was done, why, and the alternative that was considered and rejected
7. Key features (table), with longer notes on the most important ones
8. System architecture: a layered diagram, the components one by one, how a request flows step by step, and the processing pipeline with a stage table
9. Algorithms and models: the methods behind the decisions, with formulas where the project uses them
10. Data: sources, sizes, and what is real, user-supplied or simulated
11. Technology stack (table), with the reasons for the main choices
12. Interfaces and API: the main endpoints
13. Repository structure
14. Setup and running: the project's own commands
15. Testing and quality
16. Results and evaluation (table, with a chart where the project has real numbers)
17. Challenges and how they were solved
18. Security, privacy and responsible use
19. Limitations
20. Future work
21. Repository activity: language mix and commit activity, drawn from the GitHub API
22. Conclusion

## Sources

Facts come from each repository's README, its internal documentation (design notes, security reviews, decision records and implementation notes), the code itself where the README is thin (OHMEN's engines, for example), its commit history, and the résumé. Nothing is added that the sources do not support. Three projects have little public source (Stratify has an empty repository, Medical AI has none and HackNova has no README), and their documents say so.

## Updating one

Replace the PDF in `public/project-docs/` with the same file name, so links keep working, and run `npm run check`.
