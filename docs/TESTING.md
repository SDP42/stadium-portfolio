# Testing

## Automated

- `npm run check` validates `src/data.js`: eleven starters with unique numbers, required fields, description lengths and a project document for every project.
- `npm run build` must succeed with no errors; CI runs both on every push.

## In the browser

Changes to the 3D scene were verified in headless Chrome over the DevTools protocol at 1440×900 and device pixel ratio 2:

- Each route is loaded and its frame rate and worst frame are measured over three seconds with `requestAnimationFrame`.
- Uncaught exceptions and console errors are collected for the whole run.
- Screenshots of each view are checked, including the captain shot, the goal, the shootout, rain, day and night.

The flows covered: the stadium overview, every player card, passing between players, the goal, the bench, the résumé, the press box and a penalty kick.
