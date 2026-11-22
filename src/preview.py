"""Preview the built site with the same missing-page response as the live host."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="dist", **kwargs)

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)

        page = Path(self.directory, "404.html").read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(page)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(page)


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", 4173), PreviewHandler) as server:
        print("Serving http://127.0.0.1:4173", flush=True)
        server.serve_forever()
