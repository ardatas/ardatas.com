"""Version every runtime dependency, including worker/module/Wasm imports."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "public" / "julia"
names = ["worker.js", "state.js", "renderer-simd.js", "renderer-simd.wasm",
         "renderer-scalar.js", "renderer-scalar.wasm"]
versions = {name: hashlib.sha256((root / name).read_bytes()).hexdigest()[:12]
            for name in names}
(root / "manifest.json").write_text(json.dumps(versions, indent=2) + "\n")
