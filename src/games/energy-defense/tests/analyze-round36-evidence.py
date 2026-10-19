"""Read-only image/video and motion analysis; never edits game artwork."""
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image

root = Path('artifacts/energy-defense-round36')
web = json.loads((root / 'web-report.json').read_text(encoding='utf-8'))
journey = json.loads((root / 'journey-measurements.json').read_text(encoding='utf-8'))
rows = json.loads((root / 'motion-samples.json').read_text(encoding='utf-8'))
road = next(v['road'] for v in web['viewports'] if v['w'] == 390)
points = [tuple(map(float, m)) for m in re.findall(r'[ML](-?[\d.e]+) (-?[\d.e]+)', road)]
segments = list(zip(points, points[1:]))
trace = []
for row in rows:
    for entity in row['creeps']:
        if entity['id'] != 'energy-creep-2':
            continue
        values = list(map(float, re.findall(r'translate[XY]\((-?[\d.]+)px\)', entity['transform'])))
        if len(values) < 2:
            continue
        x, y = values[0] + 31, values[1] + 62 * 228 / 256

        def distance(segment):
            (ax, ay), (bx, by) = segment
            dx, dy = bx - ax, by - ay
            t = max(0, min(1, ((x-ax)*dx + (y-ay)*dy)/(dx*dx+dy*dy)))
            return math.hypot(x-ax-t*dx, y-ay-t*dy)

        trace.append({'t': row['t'], 'x': x, 'y': y, 'laneError': min(map(distance, segments))})
signs = []
for a, b in zip(trace, trace[1:]):
    dx = b['x'] - a['x']
    if abs(dx) > 2:
        sign = 1 if dx > 0 else -1
        if not signs or sign != signs[-1]:
            signs.append(sign)
result = {'platform': 'Chrome real-time DOM positions, not native', 'samples': len(trace),
          'directionSequence': signs, 'maxCenterlineDistance': max(p['laneError'] for p in trace),
          'allowedLaneOffset': 9, 'first': trace[0], 'lastBeforeEscape': trace[-1]}
assert signs == [1, -1, 1]
assert result['maxCenterlineDistance'] < 9.5
(root/'motion-analysis.json').write_text(json.dumps(result, indent=2), encoding='utf-8')

# The recording uses one real UI shot, killing ID1. Infer subsequent escape IDs.
births = {e['id']: e for e in web['liveSpawns'][:5]}
before = set(births) - {1}
speed = {'scout': 1.3, 'slime': 1, 'golem': .7}
arrivals = []
for row in web['arrivals']:
    remaining = set(row['remaining'])
    escaped = before - remaining
    assert len(escaped) == 1
    identity = escaped.pop()
    enemy = births[identity]
    expected = journey['afterLogicalLength']/speed[enemy['type']]*100
    measured = row['clock'] - enemy['bornAt']
    assert 0 <= measured - expected < 25
    arrivals.append({'id': identity, 'type': enemy['type'], 'bornAtMs': enemy['bornAt'],
                     'escapeClockMs': row['clock'], 'expectedTravelMs': expected,
                     'measuredTravelMs': measured, 'errorMs': measured-expected, 'hp': row['hp']})
    before = remaining
(root/'live-journey-measurements.json').write_text(json.dumps(arrivals, indent=2), encoding='utf-8')

names = ['occlusion-forced-base.png', 'occlusion-forced-with-front.png', 'occlusion-forced-without-front.png']
a, b, c = [np.array(Image.open(root/'images'/name).convert('RGB'), dtype=int) for name in names]
mask = np.zeros(a.shape[:2], dtype=bool)
mask[140:220, 80:180] = True
changed = (np.max(abs(b-c), axis=2) > 20) & mask
restored = (np.max(abs(b-a), axis=2) < 8) & (np.max(abs(c-a), axis=2) > 20) & mask
pixel = {'scenario': 'Paused real clock; only modal DOM hidden; one golem translated +35 world pixels '
                     'into middle pillar. Diagnostic, not actual gameplay movement.',
         'changedPixels': int(changed.sum()), 'occludedPixelsMatchingBase': int(restored.sum()),
         'region': [80, 140, 180, 220]}
assert pixel['occludedPixelsMatchingBase'] > 20
(root/'pixel-occlusion.json').write_text(json.dumps(pixel, indent=2), encoding='utf-8')
print(json.dumps({'motion': result, 'arrivals': arrivals, 'occlusion': pixel}))
