import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which("php"), "PHP CLI required")
class LinksBoardTest(unittest.TestCase):
    def setUp(self):
        private = tempfile.TemporaryDirectory()
        self.addCleanup(private.cleanup)
        self.password = secrets.token_urlsafe()
        verifier = subprocess.check_output(
            ["php", "-r", "echo password_hash(stream_get_contents(STDIN), PASSWORD_DEFAULT);"],
            input=self.password.encode(),
        )
        Path(private.name, "password.hash").write_bytes(verifier)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        self.url = f"http://127.0.0.1:{port}/links/api.php"
        self.browser = self.new_browser()
        self.server = subprocess.Popen(
            ["php", "-S", f"127.0.0.1:{port}", "-t", str(ROOT / "server")],
            env=dict(os.environ, LINKS_PRIVATE_DIR=private.name),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.addCleanup(self.stop_server)
        for _ in range(100):
            try:
                self.call()
                break
            except urllib.error.URLError:
                time.sleep(0.03)

    def stop_server(self):
        self.server.terminate()
        self.server.wait(timeout=4)

    @staticmethod
    def new_browser():
        return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, action=None, *, browser=None, board_header=True, **fields):
        request = urllib.request.Request(self.url)
        if action:
            request.data = json.dumps(dict(action=action, **fields)).encode()
            request.add_header("Content-Type", "application/json")
            if board_header:
                request.add_header("X-Links-Board", "1")
        try:
            response = (browser or self.browser).open(request)
        except urllib.error.HTTPError as response_error:
            return response_error.code, json.load(response_error)
        with response:
            return response.status, json.load(response)

    def test_shared_writes_require_unlock_and_survive_new_sessions(self):
        note = dict(id=secrets.token_hex(16), title="Test note", url="https://example.org/", description="")
        self.assertEqual(self.call()[0], 401)
        self.assertEqual(self.call("create", **note)[0], 401)
        self.assertEqual(self.call("unlock", password="wrong")[0], 401)
        self.assertEqual(self.call("unlock", password=self.password, board_header=False)[0], 403)
        self.assertEqual(self.call("unlock", password=self.password)[0], 200)
        self.assertEqual(self.call("create", **note)[0], 200)
        notes = self.call("create", **note)[1]["notes"]
        self.assertEqual(sum(n["id"] == note["id"] for n in notes), 1)
        other = self.new_browser()
        self.assertEqual(self.call(browser=other)[0], 401)
        self.assertEqual(self.call("unlock", browser=other, password=self.password)[1]["notes"], notes)
        note["description"] = "Updated from the second session."
        self.assertEqual(self.call("edit", browser=other, revision=1, **note)[0], 200)
        self.assertEqual(self.call("edit", revision=1, **note)[0], 409)
        self.assertEqual(self.call()[1]["notes"][0]["description"], note["description"])
        self.assertEqual(self.call("delete", revision=2, id=note["id"])[0], 200)
        self.assertFalse(any(n["id"] == note["id"] for n in self.call(browser=other)[1]["notes"]))
        self.assertEqual(self.call("lock")[0], 200)
        self.assertEqual(self.call()[0], 401)
        self.assertEqual(self.call("create", **note)[0], 401)
