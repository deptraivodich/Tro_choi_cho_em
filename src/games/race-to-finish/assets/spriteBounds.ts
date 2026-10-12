// Complete poses in the ORIGINAL atlas; old extracted PNGs cut rabbit feet off.
// Character-specific canvas keeps all poses on the same ground anchor.
export const CHARACTER_ATLAS_SIZE = { width: 1024, height: 682 };
export const CHARACTER_CANVAS = { fox: 200, penguin: 200, bunny: 214, turtle: 200 };
export const SPRITE_FRAMES = {
  "fox": {
    "idle_1": {
      "x": 21,
      "y": 19,
      "width": 151,
      "height": 162
    },
    "idle_2": {
      "x": 198,
      "y": 15,
      "width": 143,
      "height": 167
    },
    "walk_1": {
      "x": 372,
      "y": 19,
      "width": 152,
      "height": 164
    },
    "walk_2": {
      "x": 537,
      "y": 27,
      "width": 148,
      "height": 156
    },
    "penalty": {
      "x": 700,
      "y": 46,
      "width": 153,
      "height": 138
    },
    "victory": {
      "x": 865,
      "y": 12,
      "width": 146,
      "height": 167
    }
  },
  "penguin": {
    "idle_1": {
      "x": 32,
      "y": 192,
      "width": 129,
      "height": 157
    },
    "idle_2": {
      "x": 204,
      "y": 193,
      "width": 128,
      "height": 154
    },
    "walk_1": {
      "x": 371,
      "y": 195,
      "width": 132,
      "height": 153
    },
    "walk_2": {
      "x": 539,
      "y": 195,
      "width": 126,
      "height": 154
    },
    "penalty": {
      "x": 718,
      "y": 202,
      "width": 114,
      "height": 148
    },
    "victory": {
      "x": 864,
      "y": 187,
      "width": 148,
      "height": 155
    }
  },
  "bunny": {
    "idle_1": {
      "x": 46,
      "y": 350,
      "width": 115,
      "height": 179
    },
    "idle_2": {
      "x": 221,
      "y": 351,
      "width": 116,
      "height": 178
    },
    "walk_1": {
      "x": 394,
      "y": 352,
      "width": 118,
      "height": 180
    },
    "walk_2": {
      "x": 552,
      "y": 352,
      "width": 122,
      "height": 181
    },
    "penalty": {
      "x": 707,
      "y": 383,
      "width": 145,
      "height": 147
    },
    "victory": {
      "x": 877,
      "y": 342,
      "width": 132,
      "height": 178
    }
  },
  "turtle": {
    "idle_1": {
      "x": 29,
      "y": 534,
      "width": 125,
      "height": 138
    },
    "idle_2": {
      "x": 201,
      "y": 534,
      "width": 126,
      "height": 136
    },
    "walk_1": {
      "x": 372,
      "y": 536,
      "width": 140,
      "height": 135
    },
    "walk_2": {
      "x": 539,
      "y": 540,
      "width": 133,
      "height": 131
    },
    "penalty": {
      "x": 710,
      "y": 545,
      "width": 135,
      "height": 125
    },
    "victory": {
      "x": 884,
      "y": 520,
      "width": 122,
      "height": 144
    }
  }
} as const;

// Original 128 x 128 portraits: exclude neighbouring-row fragments independently.
export const AVATAR_BOUNDS = {
  fox: { x: 15, y: 11, width: 112, height: 116 },
  penguin: { x: 11, y: 19, width: 116, height: 108 },
  bunny: { x: 34, y: 14, width: 92, height: 113 },
  turtle: { x: 12, y: 27, width: 115, height: 100 },
} as const;
