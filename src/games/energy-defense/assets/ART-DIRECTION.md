# Crystal Citadel artwork

These four source illustrations were generated for Energy Defense with the built-in image generation tool. The application uses the optimized PNG/WebP derivatives in this directory. `prepare-assets.py` can rebuild them from `source-art/`; it only crops, scales and packs existing pixels and preserves alpha.

## Recorded generation briefs

The original tool prompts were iterated interactively. These briefs record the visual constraints that produced the selected source art rather than claiming to be verbatim prompt transcripts.

- **Enemy sprite sheet:** A transparent 2D casual fantasy game sprite atlas with three clearly distinct small defenders’ foes: an amber fox-eared scout with a teal scarf, a pink sprout slime, and a lavender stone golem with a crystal horn and moss. Four readable side-facing walk poses per character, consistent scale and ground line, handcrafted painted game art, appealing expressions, coherent soft highlights and outlines, no shadows detached from the character, no labels or grid.
- **Crystal turret:** A transparent, premium 2D fantasy tower-defense energy cannon in jade, warm ivory, gold and violet. Separate grounded ornate base and a clearly directional rotating cannon head, large central crystal core and visible muzzle at the barrel tip; readable silhouette at small mobile size; polished painted materials and consistent light; no text or background.
- **Citadel:** A transparent small fantasy fortress destination for a child-friendly crystal-defense game, with a strong castle silhouette, teal energy gate, central cyan crystal, warm gold trim, friendly proportions and a clear ground footprint; detailed but readable 2D painted casual-game asset; no extra scenery or lettering.
- **Valley background:** A wide 2D painted fantasy battlefield landscape with a high horizon and open meadow in the lower portion for gameplay. Layer distant pale mountains and waterfalls, middle-distance pines and cliffs, and restrained foreground flowers, grass and crystals at the edges. Bright soft daylight, teal-green and warm gold palette, coherent storybook game painting, low visual contrast through the central route area; no characters, UI or lettering.

## Runtime atlas layout

The enemy atlas is 1024×768 pixels, with 256-pixel cells: four poses per row, in scout, slime, golem order. Each frame uses a common foot anchor. Turret head and base are separate transparent images so the head can aim and recoil around its pivot; the measured muzzle point is recorded in `manifest.json`. The citadel and base each use a ground pivot from that manifest.

The source drawings were generated as original project artwork. No third-party art was downloaded. No automatic background removal or generative repainting was used in the packing step.
