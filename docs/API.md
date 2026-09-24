# StreetProof API (for the frontend)

Base URL: `http://localhost:8080` (the app also serves the UI there). CORS is open for `http://localhost:5173` and `http://localhost:3000`.

## The main flow

1. `POST /api/studies` (multipart, field `file`) uploads a video. Returns a `StudyView` with status `UPLOADED`.
2. Show `links.firstFrame` (`GET /api/studies/{id}/first-frame`, a JPEG at most 1280 px wide). The user clicks two points on the near curb and types the real distance between them in metres. Click coordinates must be in that image's pixels.
3. `POST /api/studies/{id}/run` with JSON:

```json
{
  "calibration": { "mode": "CURB_MARKS", "x1": 140, "y1": 610, "x2": 900, "y2": 612, "metres": 12.0 },
  "postedLimitKmh": 40,
  "streetLabel": "Champlain Cres, Peterborough",
  "checkConditions": true
}
```

   Or calibrate on the car itself: `{ "mode": "VEHICLE_LENGTH", "metres": 4.5 }`.
4. Poll `GET /api/studies/{id}` every second. `status` goes `QUEUED → EXTRACTING → DETECTING → MEASURING → RENDERING → DONE` (or `FAILED` with `error`). While `DETECTING`, show `progress.framesDone / progress.framesTotal`, `livepeerCalls` and `estimatedCostUsd`: that is the Livepeer network working live.
5. When `DONE`, every link in `links` is filled:
   - `links.video`: the annotated MP4 (boxes, IDs, trails, speed labels; green proven, red refused).
   - `links.vehicles`: one row per vehicle (below).
   - `links.analysis`: numbers and charts (below).
   - `links.graph`: the graph for the 3D view (below).
   - `links.asset`: the Knowledge Asset (JSON-LD) that would be published.
6. `POST /api/studies/{id}/publish` publishes the study. Returns `{ ual, network, mode, publishedAt, assetSha256, contextGraph, evidence }`.
7. Verifier page: `POST /api/verify` (multipart `file`, optional `ual`). Returns `outcome`: `MATCH`, `MISMATCH` or `NO_RECORD`, with a plain-language `message`.

## One-click demo clips

- `GET /api/samples`: clips in the `samples/` folder. A clip with a `<name>.json` preset next to it has `ready: true`.
- `POST /api/samples/{name}/study`: creates the study and, if a preset exists, starts it straight away. Detections are cached per video, so the second run of a sample needs no Livepeer calls and finishes in seconds. The presets reference the calibration created by `scripts/reproduce_validation.py`, so run that first.

## Shapes

`GET /api/studies/{id}/vehicles` returns rows like:

```json
{ "trackId": 7, "label": "car", "proven": true, "kmh": 48.7, "overLimit": true,
  "reason": null, "reasonMeaning": null, "detail": null, "direction": "left-to-right",
  "firstSeenSeconds": 3.4, "lastSeenSeconds": 4.9, "cleanFrames": 14, "totalFrames": 19,
  "rSquared": 0.9991, "medianConfidence": 0.88, "knownKmh": null, "errorPercent": null,
  "thumbnailUrl": "/api/studies/{id}/vehicles/7/thumbnail" }
```

A refused vehicle has `proven: false`, `kmh: null`, a `reason` code (`TOO_FEW_CLEAN_FRAMES`, `UNSTEADY_MOTION`, `UNSTABLE_BOX`, `LOW_CONFIDENCE`, `IMPLAUSIBLE_SPEED`, `NO_CALIBRATION`, `POOR_CONDITIONS`), a `reasonMeaning` sentence and a `detail` like `"only 4 clean frames, needs 6"`.

`GET /api/studies/{id}/analysis`:

```json
{ "summary": { "vehiclesObserved": 23, "vehiclesProven": 17, "vehiclesRefused": 6, "v85Kmh": 52.3,
               "medianKmh": 44.1, "shareOverLimit": 0.412, "postedLimitKmh": 40 },
  "meanKmh": 45.2, "maxKmh": 61.0, "shareOverLimitBy10": 0.118,
  "histogram": [ { "fromKmh": 30, "toKmh": 35, "count": 2 } ], "p95Kmh": 58.0,
  "refusalsByReason": { "TOO_FEW_CLEAN_FRAMES": 4, "UNSTABLE_BOX": 2 },
  "speedOverTime": [ { "timeSeconds": 4.1, "kmh": 48.7, "trackId": 7 } ],
  "byDirection": { "left-to-right": 12, "right-to-left": 11 },
  "headline": "17 of 23 vehicles measured. 85% drove at or under 52.3 km/h; 41% went over the 40 km/h limit." }
```

## The knowledge graph

`GET /api/studies/{id}/graph` (one study) or `GET /api/graph` (every finished study). The 3D view in the app uses `/api/field` (below) instead. Shape:

```json
{ "nodes": [ { "id": "vehicle:<study>:7", "type": "vehicle", "label": "48.7 km/h", "group": "over-limit",
               "value": 48.7, "imageUrl": "/api/studies/<study>/vehicles/7/thumbnail", "data": { } } ],
  "links": [ { "source": "study:<study>", "target": "vehicle:<study>:7", "relation": "observed" } ] }
```

Node `type`: `study`, `vehicle`, `reason`, `calibration`, `gate`, `capability` (Livepeer yolo-detect), `street`, `knowledgeAsset`.
Vehicle `group`: `proven`, `over-limit`, `refused`. Colour by group and size by `value` (km/h). Vehicle nodes carry `imageUrl`, a crop of that car, for the photo-tile look.
Relations: `observed`, `refusedBecause`, `detectedWith`, `calibratedBy`, `calibratedWith` (the study used a calibration stored on the DKG), `judgedBy`, `studiedIn`, `publishedAs`.

This graph mirrors what goes into the Knowledge Asset.

## Calibration memory (stored on the DKG)

A calibration is learned once from vehicles driving at a known speed, published to the DKG, and reused by every later study from the same camera.

1. Run one or more studies of cars at a known speed (no calibration needed; every vehicle will be refused with `NO_CALIBRATION`, which is itself a good screen to show).
2. `POST /api/calibrations`:

```json
{ "cameraLabel": "VS13 roadside camera, 3 passes",
  "passes": [ { "studyId": "<id>", "knownKmh": 80, "vehicleHeightMetres": 1.644 },
              { "studyId": "<id>", "knownKmh": 72, "vehicleHeightMetres": 1.645 },
              { "studyId": "<id>", "knownKmh": 86, "vehicleHeightMetres": 1.455 } ] }
```

   One pass also works: `{ "studyId": "<id>", "knownKmh": 72, "vehicleHeightMetres": 1.645, "cameraLabel": "..." }`.
   The focal length is the **median** of the passes, so one bad pass cannot drag it off. If any pass disagrees with the median by more than 15%, the calibration is **refused** with a 400 whose `detail` names the pass. Each pass video is published as its own Knowledge Asset and the calibration cites them.
   Returns `{ id, cameraLabel, focalPx, frameWidth, frameHeight, spreadPercent, ual, network, passes: [ { clip, videoSha256, studyUal, knownKmh, vehicleHeightMetres, focalPx, deviationPercent } ] }`.
3. `GET /api/calibrations` lists them. `GET /api/calibrations/resolve?ref=<ual or id>` fetches one back **from the DKG** (the focal length comes from a SPARQL query, not from local memory).
4. Use it: `POST /api/studies/{id}/run` with `{ "calibrationRef": "<ual>", "vehicleHeightMetres": 1.5, "postedLimitKmh": 50 }`. The study's `calibrationUal` is set and its Knowledge Asset cites the calibration.

## Accuracy page

`GET /api/validation` compares measured speeds with known speeds (studies run with `group` `calibration` or `validation` and a `knownKmh`):

```json
{ "clips": 9, "proven": 9, "refused": 0, "meanAbsErrorPercent": 4.5, "maxAbsErrorPercent": 7.1,
  "calibrationClips": ["vs13-CitroenC4Picasso_80.mp4", "vs13-KiaSportage_72.mp4", "vs13-Mazda3_86.mp4"],
  "calibrationUal": "did:dkg:...", "summary": "Calibrated on ..., tested on 9 unseen clips: ...",
  "rows": [ { "clip": "vs13-Peugeot3008_83.mp4", "role": "test", "knownKmh": 83, "measuredKmh": 80.0,
              "errorPercent": -3.6, "proven": true, "refusal": null } ],
  "crossValidation": { "method": "...",
    "levels": [ { "passes": 1, "combinations": 12, "meanAbsErrorPercent": 5.9, "worstCombinationMeanPercent": 11.1, "worstClipErrorPercent": 16.8 } ],
    "singleClipChoices": [ { "clip": "vs13-Peugeot208_79.mp4", "meanAbsErrorPercent": 4.3, "worstAbsErrorPercent": 10.7 } ] } }
```

(Read the live numbers from the endpoint.) Show the rows as a table (known vs measured, error), `levels` as "1 pass / 2 passes / 3 passes" bars, and `singleClipChoices` to show that one bad calibration clip is exactly why multi-pass exists.

## City report

`GET /api/studies/{id}/report` returns a finished, printable **HTML page** for a resident to hand to the city: headline finding, 85th percentile vs limit, histogram with the limit line, refusals and why, method, how to verify it on the DKG, and limits. Open it in a new tab or an iframe; it needs no styling from the frontend.

## Every detection (the 3D view)

`GET /api/field` returns every tracked Livepeer detection from every finished study, in a compact column form:

```json
{ "detections": 1649,
  "studies": [ { "id": "...", "clip": "vs13-KiaSportage_72.mp4", "street": "VS13 test road", "group": "validation",
                 "calibrated": true, "calibrationUal": "did:dkg:...", "ual": null, "postedLimitKmh": 50,
                 "knownKmh": 72, "frameWidth": 856, "frameHeight": 480 } ],
  "vehicles": [ { "study": 0, "trackId": 1, "group": "over-limit", "kmh": 67.4, "reason": null, "reasonMeaning": null,
                  "detail": null, "direction": "right-to-left", "medianConfidence": 0.83, "errorPercent": -6.4,
                  "thumbnailUrl": "/api/studies/.../vehicles/1/thumbnail", "detections": 93 } ],
  "points": { "vehicle": [0, 0], "frame": [12, 13], "t": [0.733, 0.8], "confidence": [0.81, 0.84],
              "x": [0.4312, 0.4298], "y": [0.3871, 0.3902], "w": [0.041, 0.043], "h": [0.052, 0.055] } }
```

`points` are parallel arrays, one entry per detection. `vehicle` indexes `vehicles`, and `study` indexes `studies`. `x`, `y`, `w` and `h` are the box centre and size as fractions of the frame.

## Verify by fingerprint

`POST /api/verify/hash` with `{ "sha256": "<64 hex>", "ual": "did:dkg:..." }` does the same check as `/api/verify` without uploading the video: the browser hashes the file and sends only the fingerprint.

## Other

- `GET /api/studies`: every study (newest first).
- `GET /api/studies/{id}/source`: the original video.
- `GET /api/studies/{id}/history`: earlier published studies of the same `streetLabel` (before/after a speed bump).
- `GET /api/health`: `ffmpeg`, `livepeerKeySet`, `knowledgeMode`.
- Errors are JSON `ProblemDetail`: `{ "status": 400, "detail": "The two curb marks must be at least 20 pixels apart along the road" }`. Show `detail` to the user as is.
