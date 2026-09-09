# Orbit Roll design direction

An unhurried spatial puzzle game. The route and the cube carry the personality; menus give them room.

- **Show the next real trail.** Home uses the game renderer and the player's next unfinished level, with one prominent play action. Its preview shows the opening section, not the whole route.
- **Give levels a shape.** Small route drawings in the level list come from each level's coordinates. Group levels by chapter; show locked requirements in plain language.
- **Keep play quiet.** Compact progress, three crystal icons, and a roll count leave more room for the board. Show lift buttons when a lift is available. Keep pause and the control toggle reachable.
- **Use emphasis sparingly.** Bright edges identify the next step; gold arrows identify drops. Menu backgrounds stay subdued. Shapes and labels accompany color cues.
- **React to what happened.** Completion copy reflects the result. Earned stars appear in sequence, and the next trail is one tap away. Reduced motion shows the result immediately.
- **Write like a person.** Prefer “Pick a trail” and “Try that turn again” to repeated promotional slogans. Instructions should explain an action or help recover from a mistake.

Keep animation on Reanimated shared values. Reuse the trail renderer for previews; cache small route drawings rather than mounting a live game for every list row. Local records and unlock rules remain separate from decorative animation.

Before release, review these screens on a small phone with large text, VoiceOver/TalkBack, and reduced motion. Check new-player onboarding, a saved journey, all trails finished, and a lower-deck landing. The current implementation has code/bundle checks; those do not substitute for visual and touch testing.
