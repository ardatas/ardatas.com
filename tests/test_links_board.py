import html
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import sqlite3
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
        self.db_path = Path(private.name, "board.sqlite")
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
            ["php", "-S", f"127.0.0.1:{port}", "-t", str(ROOT / "dist")],
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

    def test_unlock_cookie_is_scoped_to_board(self):
        request = urllib.request.Request(self.url, data=json.dumps({
            "action": "unlock", "password": self.password,
        }).encode(), headers={"Content-Type": "application/json", "X-Links-Board": "1"})
        with self.browser.open(request) as response:
            cookies = response.headers.get_all("Set-Cookie") or []
            self.assertTrue(json.load(response)["canWrite"])
        cookie = next(value.lower() for value in cookies if value.startswith("ardatas_links="))
        for attribute in ("path=/links", "httponly", "samesite=strict"):
            self.assertIn(attribute, cookie)

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

    def test_first_response_contains_current_notes_and_session(self):
        note = dict(id=secrets.token_hex(16), title='R&D <reading>', url='https://example.org/?a=1&b=2',
                    description='Save the </script> example for later.')
        self.assertEqual(self.call("unlock", password=self.password)[0], 200)
        self.assertEqual(self.call("create", **note)[0], 200)
        for browser, can_write in [(self.new_browser(), False), (self.browser, True)]:
            with self.subTest(can_write=can_write), browser.open(self.url.removesuffix("api.php")) as response:
                page = response.read().decode()
                self.assertIn("no-store", response.headers["Cache-Control"])
                self.assertNotIn("Opening links", page)
                self.assertIn(f'href="{html.escape(note["url"])}"', page)
                for key in ("title", "description"):
                    self.assertIn(html.escape(note[key]), page)
                state = json.loads(re.search(r'id="initial-links">(.*?)</script>', page).group(1))
                self.assertEqual(state, self.call(browser=browser)[1])
                self.assertEqual(state["canWrite"], can_write)

    def test_shared_writes_require_unlock_and_survive_new_sessions(self):
        note = dict(id=secrets.token_hex(16), title="Test note", url="https://example.org/", description="")
        self.assertFalse(self.call()[1]["canWrite"])
        self.assertEqual(self.call("create", **note)[0], 401)
        self.assertEqual(self.call("unlock", password="wrong")[0], 401)
        self.assertEqual(self.call("unlock", password=self.password, board_header=False)[0], 403)
        self.assertEqual(self.call("unlock", password=self.password)[0], 200)
        self.assertEqual(self.call("create", **note)[0], 200)
        notes = self.call("create", **note)[1]["notes"]
        self.assertEqual(sum(n["id"] == note["id"] for n in notes), 1)
        other = self.new_browser()
        self.assertEqual(self.call(browser=other), (200, {"notes": notes, "tags": [], "canWrite": False}))
        for action in ("create", "edit", "delete"):
            self.assertEqual(self.call(action, browser=other, revision=1, **note)[0], 401)
        self.assertEqual(self.call("unlock", browser=other, password=self.password)[1]["notes"], notes)
        note["description"] = "Updated from the second session."
        self.assertEqual(self.call("edit", browser=other, revision=1, **note)[0], 200)
        self.assertEqual(self.call("edit", revision=1, **note)[0], 409)
        self.assertEqual(self.call()[1]["notes"][0]["description"], note["description"])
        self.assertEqual(self.call("delete", revision=2, id=note["id"])[0], 200)
        self.assertFalse(any(n["id"] == note["id"] for n in self.call(browser=other)[1]["notes"]))
        self.assertEqual(self.call("lock")[0], 200)
        self.assertFalse(self.call()[1]["canWrite"])
        self.assertEqual(self.call("create", **note)[0], 401)

    def test_existing_database_migrates_and_tags_are_shared(self):
        # Recreate the pre-tag schema with one user's note.
        self.db_path.unlink()
        with sqlite3.connect(self.db_path) as db:
            db.execute("CREATE TABLE notes (seq INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, title TEXT, "
                       "url TEXT, description TEXT, revision INTEGER NOT NULL DEFAULT 1)")
            db.execute("INSERT INTO notes(id,title,url,description) VALUES (?,?,?,?)",
                       ("a" * 32, "Original", "https://example.org", "Saved earlier"))
        board = self.call()[1]
        self.assertEqual(len(board["notes"]), 1)
        note = board["notes"][0]
        self.assertIsNone(note["tagId"])
        options = json.loads((ROOT / "server/links/tag-options.json").read_text())
        self.assertEqual(len(set(options["icons"].values())), 30)
        self.assertEqual(len(set(options["colours"].values())), 30)
        tag = dict(id=secrets.token_hex(16), name="R&D <study>",
                   icon=options["icons"]["Graduation"], colour=options["colours"]["Slate"])
        self.assertEqual(self.call("createTag", **tag)[0], 401)
        self.call("unlock", password=self.password)
        for key in ["icon", "colour"]:
            self.assertEqual(self.call("createTag", **(tag | {key: "unknown"}))[0], 422)
        for _ in range(2):
            self.assertEqual(self.call("createTag", **tag)[1]["tags"], [tag | {"revision": 1}])
        self.assertEqual(self.call("createTag", **(tag | {"id": secrets.token_hex(16)}))[0], 409)
        self.assertEqual(self.call("edit", **(note | {"tagId": "unknown"}))[0], 422)
        self.assertEqual(self.call("edit", **(note | {"tagId": tag["id"]}))[0], 200)
        other = self.new_browser()
        self.assertEqual(self.call(browser=other)[1]["notes"][0]["tagId"], tag["id"])
        with other.open(self.url.removesuffix("api.php")) as response:
            page = response.read().decode()
        self.assertIn(html.escape(tag["name"]), page)
        self.assertIn("--paper: " + tag["colour"], page)
        self.assertIn(tag["icon"], page)
        del note["tagId"]
        saved = self.call("edit", **(note | {"revision": 2}))[1]["notes"][0]
        self.assertEqual(saved["tagId"], tag["id"])
        self.assertIsNone(self.call("edit", **(saved | {"tagId": None}))[1]["notes"][0]["tagId"])
        self.assertEqual(self.call(browser=other)[1]["tags"], [tag | {"revision": 1}])

    def test_tag_settings_sort_and_preserve_notes(self):
        self.call("unlock", password=self.password)
        tag = dict(id=secrets.token_hex(16), name="Zebra", icon="📚", colour="#fff0a8")
        other = tag | {"id": secrets.token_hex(16), "name": "Music"}
        for t in [tag, other]:
            self.assertEqual(self.call("createTag", **t)[0], 200)
            self.assertEqual(self.call("create", id=secrets.token_hex(16), title=t["name"],
                                       url="https://example.org", tagId=t["id"])[0], 200)
        public = self.new_browser()
        changed = tag | {"name": "Art", "colour": "#f9d8c7", "revision": 1}
        self.assertEqual(self.call("editTag", browser=public, **changed)[0], 401)
        self.assertEqual(self.call("deleteTag", browser=public, **changed)[0], 401)
        self.assertEqual(self.call("editTag", **(changed | {"name": "Music"}))[0], 422)
        status, board = self.call("editTag", **changed)
        self.assertEqual(status, 200)
        self.assertEqual(board["tags"][0], changed | {"revision": 2})
        self.assertEqual([n["tagId"] for n in board["notes"][:2]], [tag["id"], other["id"]])
        self.assertEqual(self.call("editTag", **changed)[0], 409)
        self.assertEqual(self.call("deleteTag", **changed)[0], 409)
        self.assertEqual(self.call()[1]["notes"], board["notes"])
        status, result = self.call("deleteTag", **(changed | {"revision": 2}))
        self.assertEqual(status, 200)
        self.assertEqual(len(result["notes"]), len(board["notes"]))
        self.assertEqual(result["notes"][0]["tagId"], other["id"])
        old = next(n for n in result["notes"] if n["id"] == board["notes"][0]["id"])
        self.assertEqual(old, board["notes"][0] | {"tagId": None, "revision": 2})
        self.assertEqual(result["tags"], [other | {"revision": 1}])
