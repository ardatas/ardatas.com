import json
import runpy
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class GbsImportTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        root = Path(folder.name)
        for directory in ("scripts", "src", "docs"):
            (root / directory).mkdir()
        self.script = root / "scripts/import-gbs.py"
        shutil.copyfile(Path(__file__).resolve().parents[1] / "scripts/import-gbs.py", self.script)
        (root / "src/academic-calendar.json").write_text('{"days":[],"breaks":[]}')
        self.snapshot = root / "src/gbs.json"
        self.coverage = root / "docs/gbs-coverage.json"
        self.snapshot.write_text("previous snapshot")
        self.coverage.write_text("previous coverage")
        self.row = dict(tutorial=624, id=17, name="Fixture", day="Mi", status="PLANED",
                        start="13:00", end="14:00", tutor=1)

    def refresh(self, rows):
        def feed(command):
            url = command[-1]
            if url.endswith("/get_capacity/"):
                result = [dict(id=624, room="Room", programming_tutorial=False)]
            elif url.endswith("/get_name_id/"):
                result = []
            else:
                result = rows if url.endswith("2026-10-26") else []
            return json.dumps(result).encode()

        with patch("subprocess.check_output", side_effect=feed):
            runpy.run_path(str(self.script))

    def test_numeric_ids_generate_canonical_session_links(self):
        self.refresh([{**self.row, "id": "17"}])
        event = json.loads(self.snapshot.read_text())[0]["occurrences"][0]
        self.assertEqual(event["id"], "gbs-session-17")
        self.assertEqual(event["source"], "https://gbs.cm.in.tum.de/tutorials/sessions/624/17")

    def test_invalid_or_duplicate_ids_leave_both_snapshots_untouched(self):
        for rows in ([{**self.row, "id": "17\r\nsecond-line"}],
                     [{**self.row, "tutorial": "624/other"}],
                     [{**self.row, "id": True}], [self.row, self.row]):
            with self.subTest(rows=rows):
                with self.assertRaises(ValueError):
                    self.refresh(rows)
                self.assertEqual(self.snapshot.read_text(), "previous snapshot")
                self.assertEqual(self.coverage.read_text(), "previous coverage")
