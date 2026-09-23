# StreetProof API (for the frontend)

Base URL in dev: `http://localhost:8080`. CORS is open for `http://localhost:5173` and `http://localhost:3000`.

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
- `POST /api/samples/{name}/study`: creates the study and, if a preset exists, starts it straight away. Detections are cached per video, so the second run of a sample needs no Livepeer calls and finishes in seconds. That's the judge button.

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
  "histogram": [ { "fromKmh": 30, "toKmh": 35, "count": 2 } ],
  "refusalsByReason": { "TOO_FEW_CLEAN_FRAMES": 4, "UNSTABLE_BOX": 2 },
  "speedOverTime": [ { "timeSeconds": 4.1, "kmh": 48.7, "trackId": 7 } ],
  "byDirection": { "left-to-right": 12, "right-to-left": 11 },
  "headline": "17 of 23 vehicles measured. 85% drove at or under 52.3 km/h; 41% went over the 40 km/h limit." }
```

## The 3D graph

`GET /api/studies/{id}/graph` (one study) or `GET /api/graph` (every finished study, for the "everything" view). Shape:

```json
{ "nodes": [ { "id": "vehicle:<study>:7", "type": "vehicle", "label": "48.7 km/h", "group": "over-limit",
               "value": 48.7, "imageUrl": "/api/studies/<study>/vehicles/7/thumbnail", "data": { } } ],
  "links": [ { "source": "study:<study>", "target": "vehicle:<study>:7", "relation": "observed" } ] }
```

Node `type`: `study`, `vehicle`, `reason`, `calibration`, `gate`, `capability` (Livepeer yolo-detect), `street`, `knowledgeAsset`.
Vehicle `group`: `proven`, `over-limit`, `refused`. Colour by group and size by `value` (km/h). Vehicle nodes carry `imageUrl`, a crop of that car, for the photo-tile look.
Relations: `observed`, `refusedBecause`, `detectedWith`, `calibratedBy`, `judgedBy`, `studiedIn`, `publishedAs`.

This graph mirrors what goes into the Knowledge Asset, so the 3D view is literally the knowledge the DKG holds.

## Other

- `GET /api/studies`: every study (newest first).
- `GET /api/studies/{id}/source`: the original video.
- `GET /api/studies/{id}/history`: earlier published studies of the same `streetLabel` (before/after a speed bump).
- `GET /api/health`: `ffmpeg`, `livepeerKeySet`, `knowledgeMode`.
- Errors are JSON `ProblemDetail`: `{ "status": 400, "detail": "The two curb marks must be at least 20 pixels apart along the road" }`. Show `detail` to the user as is.
