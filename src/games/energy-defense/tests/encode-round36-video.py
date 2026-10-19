"""Encode recorded web video only. Does not edit any game image/asset.

Hold each original JPEG until its recorded successor timestamp, at 1x time.
Use installed OpenCV/Windows Media Foundation H264; no dependency installation.
"""
import argparse
import json
import math
from pathlib import Path

import cv2

root = Path('artifacts/energy-defense-round36')
parser = argparse.ArgumentParser()
parser.add_argument('--portal-only', action='store_true')
options = parser.parse_args()
all_events = json.loads((root/'video-frames/timestamps.json').read_text(encoding='utf-8'))
origin = all_events[0]['timestamp']


def encode(portal=False):
    events = [e for e in all_events if not portal or 8.2 <= e['timestamp']-origin <= 14.2]
    duration = events[-1]['timestamp']-events[0]['timestamp']
    fps = 20
    frames = math.ceil(duration*fps)
    size = (570, 510) if portal else (390, 844)
    name = 'portal-closeup-web-1x.mp4' if portal else 'gameplay-web-1x.mp4'
    writer = cv2.VideoWriter(str(root/name), cv2.CAP_MSMF, cv2.VideoWriter_fourcc(*'H264'), fps, size)
    assert writer.isOpened(), 'Installed Media Foundation H264 encoder unavailable'
    index, loaded = 0, -1
    rejected = []
    for frame in range(frames):
        timestamp = events[0]['timestamp']+frame/fps
        while index+1 < len(events) and events[index+1]['timestamp'] <= timestamp:
            index += 1
        if loaded != index:
            candidate = cv2.imread(str(root/'video-frames'/events[index]['file']))
            assert candidate is not None
            if (candidate.shape[1], candidate.shape[0]) != (390, 844):
                # A simultaneous CDP screenshot can emit one cropped screencast frame.
                # Hold its predecessor; never stretch a crop into a fake full game frame.
                rejected.append(events[index]['file'])
                assert loaded >= 0
            else:
                image = cv2.resize(candidate[100:270, 45:235], size, interpolation=cv2.INTER_LINEAR) if portal else candidate
            loaded = index
        writer.write(image)
        if frame % 400 == 0:
            print(f'{name}: encoded {frame}/{frames}', flush=True)
    writer.release()
    capture = cv2.VideoCapture(str(root/name))
    actual = 0
    timestamps = []
    while True:
        ok, _ = capture.read()
        if not ok:
            break
        timestamps.append(capture.get(cv2.CAP_PROP_POS_MSEC))
        actual += 1
    capture.release()
    assert actual == frames, (actual, frames)
    max_gap = max(b-a for a, b in zip(timestamps, timestamps[1:]))
    assert max_gap < 51
    meta = {'file': name, 'mime': 'video/mp4;codecs=avc1', 'width': size[0], 'height': size[1],
            'sourceSeconds': duration, 'seconds': frames/fps, 'capturedSeconds': duration,
            'capturedFrames': len(events), 'encodedFrames': frames, 'maxEncodedPtsGapMs': max_gap,
            'sourceMaxIntervalMs': max((b['timestamp']-a['timestamp'])*1000 for a, b in zip(events, events[1:])),
            'bytes': (root/name).stat().st_size, 'audio': False, 'rejectedScreenshotCropFrames': rejected,
            'platform': 'Actual Chrome production web capture; not native',
            'speed': '1x original capture timestamps. Hold source frames until successor; no interpolation or acceleration.',
            'encoder': 'Installed OpenCV/Windows Media Foundation H264, 20fps output is not game/native FPS'}
    if portal:
        meta['crop'] = {'x': 45, 'y': 100, 'width': 190, 'height': 170, 'scale': 3,
                        'sourceFromSeconds': 8.2, 'sourceToSeconds': 14.2}
    path = 'portal-video-metadata.json' if portal else 'video-metadata.json'
    (root/path).write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(json.dumps(meta))


if not options.portal_only:
    encode()
encode(True)
