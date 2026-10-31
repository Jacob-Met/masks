#!/usr/bin/env python3
"""Deterministic offline Masks browser preview with explicit source custody."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)
FILES = [
    ROOT / "README.md",
    ROOT / "LICENSE",
    ROOT / "package.json",
    ROOT / "server.mjs",
    *sorted((ROOT / "src").glob("*.mjs")),
    *sorted((ROOT / "public").glob("*")),
    *sorted((ROOT / "test").glob("*.mjs")),
    ROOT / "scripts" / "package.py",
]
assert all(p.is_file() and p.resolve().is_relative_to(ROOT) for p in FILES)
raw = {str(p.relative_to(ROOT)): p.read_bytes() for p in FILES}
manifest = "".join(hashlib.sha256(b).hexdigest() + "  " + path + "\n" for path, b in sorted(raw.items()))
raw["SHA256SUMS"] = manifest.encode()
raw["OPEN.txt"] = (
    "MASKS — private witness-view preview\n"
    "Requires Node 22+. No packages to install, no key required.\n"
    "From the extracted masks/ directory: node --test; node server.mjs\n"
    "Open http://127.0.0.1:4415 in a browser.\n"
    "Witness view is the default. The director lens reveals spoilers.\n"
    "This is a local preview, not an authenticated secrets boundary.\n"
).encode()
try:
    commit = subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
except Exception:
    commit = "uncommitted"
raw["SOURCE_COMMIT.txt"] = (commit + "\n").encode()

def info(name):
    z = ZipInfo("masks/" + name, (1980,1,1,0,0,0))
    z.compress_type = ZIP_DEFLATED
    z.external_attr = 0o644 << 16
    z.create_system = 3
    return z

out = DIST / "masks-witness-preview.zip"
with ZipFile(out, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, body in sorted(raw.items()):
        archive.writestr(info(name), body, compress_type=ZIP_DEFLATED, compresslevel=9)
sidecar = out.with_suffix(out.suffix + ".sha256")
digest = hashlib.sha256(out.read_bytes()).hexdigest()
sidecar.write_text(digest + "  " + out.name + "\n")
print(f"{out} {out.stat().st_size} bytes SHA-256 {digest}, files {len(raw)}")
