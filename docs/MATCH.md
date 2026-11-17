# The live match

`src/match.js` runs both teams, the referee and the ball.

## Players

Each footballer is an articulated figure of ten meshes (thighs, shins, upper and lower arms, torso and a merged head and body) that share geometry and one vertex-colour material. Hips, knees, shoulders and elbows are pivots, so the gait is computed rather than played from clips: stride frequency and amplitude follow speed, the pelvis bobs and leans, and the arms swing against the legs. Kicks use a back-swing and strike on the right leg.

Our XI wears sky blue, the captain gold with an armband and the keepers charcoal. The rival BUGS FC (desktop only) wear red, with a green keeper, and a referee in black follows play.

## Movement

Each agent steers toward a goal point:

- **Default:** its home position plus a gentle wander.
- **Away team:** pulled 14% of the way toward the ball, so they press.
- **Keepers:** stay on their line and shadow the ball's sideways position.
- **Referee:** keeps a fixed offset from the ball.
- **Targets:** a pass receiver sprints to meet the ball; after a goal, teammates run to the scorer.

Velocity is eased, heading turns toward the direction of travel or toward the ball, and each agent casts a soft blob shadow from one shared instanced mesh.

## The ball

- **Ground pass:** decelerates as it rolls, spinning about the axis perpendicular to its path.
- **Lofted pass** (over 26 m): arcs, then makes two shrinking bounces while still travelling.
- **At the feet:** follows the owner's foot; the player you are viewing does keepy-uppies.

## Penalties

`penaltySetup()` places the ball on the spot, walks the striker to the run-up and sets the rival keeper in a ready crouch. `penaltyKick(aim)` runs the striker in, plays the kick, and has the keeper dive. The keeper reads the shot 40% of the time and otherwise guesses left, centre or right. A shot is wide if it misses the frame, saved if it is within the keeper's reach and low enough, and a goal otherwise.
