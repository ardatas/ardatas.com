import os
from flask import Flask, send_from_directory
from werkzeug.exceptions import NotFound

dist = os.path.join(os.getcwd(), "dist")
public = os.path.join(os.getcwd(), "public")

app = Flask(__name__)


@app.route("/<path:path>")
def send_static(path):
    try:
        return send_from_directory(dist, path, max_age=0)
    except NotFound:
        try:
            return send_from_directory(dist, f"{path}.html", max_age=0)
        except NotFound:
            return send_from_directory(public, path, max_age=60 * 60 * 24 * 365)


@app.errorhandler(404)
def not_found(error):
    return send_from_directory(dist, "404.html", max_age=0, conditional=False), 404


@app.route("/")
def index():
    return send_from_directory(dist, "index.html", max_age=0)


if __name__ == "__main__":
    app.run(port=5000)
