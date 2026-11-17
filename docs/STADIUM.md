# The stadium model

The stadium is a procedural twin of Manchester City's Etihad Stadium, modelled from aerial and interior photographs. It keeps the architecture and leaves out the club's badge and sponsor names.

## Plan shapes

Every ring in the stadium (the stand fronts, the roof opening and the outer roof edge) is a superellipse, `|x/A|^n + |z/B|^n = 1`, sampled by angle. Using the same family for every ring keeps the stands, roof and facade aligned.

| Constant | Value | Meaning |
|---|---|---|
| `BOWL` | A 66, B 47, n 4 | Front row of the lower tier, just outside the pitch |
| `ROOF_OPEN` | A 72, B 53, n 4 | Inner edge of the roof |
| `SHELL` | A 120, B 101, n 4 | Outer edge of the roof; the facade sits just inside it |

## Stands

`STAND` is the stand profile as (offset from the front row, height) pairs: three seating tiers separated by vertical concourse fronts. `TIERS` marks which segments carry seats. Seat rows use a tiled seat texture, aisles are merged into one mesh, and two LED ribbons run along the tier fronts (sky blue below, white between the upper tiers).

## Roof

The roof is a saddle: `roofOutY(t)` lifts the outer edge from 45.5 m at the ends to 52 m along the sides, and `roofInY(t)` does the same for the inner edge. From above it shows a grey metal band, a wide glazed inner band with a dark grid and corner ridges; from below, heavy dark ribs with the sky glowing through the glazing. A white fascia runs round the outer edge.

## Towers and masts

Twelve drum towers stand outside the facade: four along each end and two on each long side. They are one instanced mesh whose sky-blue stripe is sheared into a real spiral. The eight end towers carry steel masts with fans of cable stays to the roof edge, and V-shaped struts rise on the long sides.

## Crowd

Every seat on the row grid gets a spectator, up to 26,000 on desktop and 9,000 on phones, drawn as one instanced mesh with a custom shader for the Mexican wave, idle sway, hype bounce and camera flashes. The lower and middle tiers of the west stand hold an `SDP42` tifo, and one corner is the red-and-black away end.

## Around the pitch

Stewards in hi-vis, photographers behind the goals, substitutes in the dugouts, corner flags, scrolling LED boards, goals with nets that bulge, a players' tunnel, a press box and two big screens.

## Outside

Esplanade paving, a winding approach path, marked car parks with parked cars, an academy stadium with a blue track, teal-roofed halls, brick terraces, trees, street lamps, fans walking in and ring-road traffic.
