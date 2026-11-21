"""Publish only the MacBook's curated directory tree and its PDF previews."""
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess


def publish_home(home: Path, output: Path):
    entries = []
    for path in sorted(home.rglob("*")):
        relative = path.relative_to(home)
        if path.is_symlink() or any(part.startswith(".") for part in relative.parts):
            continue
        virtual = "/" + relative.as_posix()
        if path.is_dir():
            entries.append({"path": virtual, "kind": "directory"})
        elif path.is_file() and path.suffix.lower() == ".pdf":
            digest = hashlib.sha256(path.read_bytes()).hexdigest()[:20]
            destination = output / "macbook-documents" / digest
            destination.mkdir(parents=True, exist_ok=True)
            info = subprocess.check_output(["pdfinfo", str(path)], text=True,
                                           env={**os.environ, "LC_ALL": "C"})
            pages = int(re.search(r"^Pages:\s+(\d+)", info, re.MULTILINE)[1])
            shutil.copyfile(path, destination / "original.pdf")
            for page in range(1, pages + 1):
                subprocess.run(["pdftocairo", "-svg", "-f", str(page), "-l", str(page),
                                str(path), str(destination / f"{page}.svg")], check=True)
            entries.append({"path": virtual, "kind": "pdf", "pages": pages,
                            "url": f"/macbook-documents/{digest}"})
    return entries
