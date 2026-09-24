import json
import os
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("STREETPROOF_URL", "http://localhost:8080").rstrip("/") + "/api"
SAMPLES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "samples") + "/"
OUT = "validation_result.json"

HEIGHTS = {
    "CitroenC4Picasso_80": 1.644,
    "KiaSportage_72": 1.645,
    "Mazda3_86": 1.455,
    "MercedesGLA_88": 1.494,
    "NissanQashqai_82": 1.595,
    "OpelInsignia_70": 1.498,
    "Peugeot208_79": 1.460,
    "Peugeot3008_83": 1.635,
    "Peugeot307_82": 1.510,
    "RenaultCaptur_66": 1.566,
    "RenaultScenic_80": 1.645,
    "VWPassat_85": 1.473,
}
CALIBRATION_CLIPS = sorted(HEIGHTS)[:3]
CAMERA = "VS13 roadside camera, 3 passes, v2"


def log(*parts):
    print(time.strftime("%H:%M:%S"), *parts, flush=True)


def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> {e.code}: {e.read().decode()[:800]}")


def upload(clip):
    out = subprocess.run(["curl", "-s", "-F", f"file=@{SAMPLES}vs13-{clip}.mp4", BASE + "/studies"],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)["id"]


def run_and_wait(study_id, body):
    call("POST", f"/studies/{study_id}/run", body)
    while True:
        time.sleep(3)
        s = call("GET", f"/studies/{study_id}")
        if s["status"] in ("DONE", "FAILED"):
            return s


def kmh(clip):
    return int(clip.rsplit("_", 1)[1])


for _ in range(60):
    try:
        log("health", json.dumps(call("GET", "/health")))
        break
    except Exception:
        time.sleep(2)

log("calibration clips (first three by filename):", CALIBRATION_CLIPS)

log("1. Passes run with no calibration (every vehicle refused: the refusal demo)")
pass_ids = {}
for clip in CALIBRATION_CLIPS:
    sid = upload(clip)
    s = run_and_wait(sid, {"knownKmh": kmh(clip), "sampleFps": 15, "streetLabel": "VS13 test road"})
    pass_ids[clip] = sid
    reasons = sorted({v.get("reason") for v in call("GET", f"/studies/{sid}/vehicles")})
    log("  ", clip, s["status"], "observed", s["summary"]["vehiclesObserved"], "proven", s["summary"]["vehiclesProven"], reasons)

existing = [c for c in call("GET", "/calibrations") if c.get("cameraLabel") == CAMERA and "did:dkg:" in (c.get("ual") or "")]
if existing:
    log("2. Reusing the 3-pass calibration already on the DKG")
    cal = existing[0]
else:
    log("2. Learn one calibration from the three passes and publish it (passes + calibration to the DKG)")
    cal = call("POST", "/calibrations", {"cameraLabel": CAMERA, "passes": [
        {"studyId": pass_ids[c], "knownKmh": kmh(c), "vehicleHeightMetres": HEIGHTS[c]} for c in CALIBRATION_CLIPS]})
log("   calibration", json.dumps({k: cal.get(k) for k in ("id", "focalPx", "spreadPercent", "ual")}))
for p in cal.get("passes") or []:
    log("   pass", p["clip"], "focal", p["focalPx"], "deviation", p["deviationPercent"], "asset", p["studyUal"])
ref = cal["ual"]

log("3. Resolve it back from the DKG")
resolved = call("GET", "/calibrations/resolve?ref=" + urllib.parse.quote(ref, safe=""))
log("   resolved focal", resolved["focalPx"], "width", resolved["frameWidth"])

log("4. All 12 clips measured with the stored calibration")
for clip, height in HEIGHTS.items():
    sid = upload(clip)
    group = "calibration" if clip in CALIBRATION_CLIPS else "validation"
    s = run_and_wait(sid, {"calibrationRef": ref, "vehicleHeightMetres": height, "knownKmh": kmh(clip),
                           "group": group, "sampleFps": 15, "streetLabel": "VS13 test road"})
    log("  ", clip, group, s["status"], "v85", (s.get("summary") or {}).get("v85Kmh"), s.get("error"))

report = call("GET", "/validation")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"calibration": cal, "resolved": resolved, "passStudies": pass_ids, "report": report}, f, indent=2)
log("REPORT", report["summary"])
for row in report["rows"]:
    log("  ", row["clip"], row["role"], row["knownKmh"], row["measuredKmh"], row["errorPercent"], row["proven"], row["refusal"])
cv = report.get("crossValidation")
if cv:
    for level in cv["levels"]:
        log("   cross-validation", json.dumps(level))
    for choice in cv["singleClipChoices"]:
        log("   single clip", json.dumps(choice))
log("ALL DONE")
