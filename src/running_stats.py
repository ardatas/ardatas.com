"""Format a saved running snapshot for the static homepage."""

import json
import math
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


def strava_url(value):
    """Return a canonical link to one of the two Strava HTTPS origins."""
    if not isinstance(value, str) or "\\" in value or any(
        char.isspace() or not char.isprintable() for char in value
    ):
        raise ValueError("Invalid Strava URL")
    parts = urlsplit(value)
    host = parts.netloc.lower().removesuffix(":443")
    if parts.scheme != "https" or host not in ("strava.com", "www.strava.com"):
        raise ValueError("Expected an HTTPS Strava URL without credentials")
    return urlunsplit(("https", host, parts.path or "/", parts.query, parts.fragment))


def format_running_stats(data):
    for key in ("distance_km", "moving_time_seconds", "runs", "elevation_gain_m"):
        value = data.get(key)
        if value is not None and (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise ValueError(f"Running {key} must be a non-negative number or null")
    runs = data.get("runs")
    if runs is not None and runs != int(runs):
        raise ValueError("Running runs must be a whole number")

    updated_at = data.get("updated_at")
    updated_label = date.fromisoformat(updated_at).strftime("%d %b %Y") if updated_at else None
    profile_url = data.get("profile_url")
    if profile_url is not None and profile_url != "":
        profile_url = strava_url(profile_url)

    distance = data.get("distance_km")
    seconds = data.get("moving_time_seconds")
    elevation = data.get("elevation_gain_m")
    best_efforts = [
        {**effort, "url": strava_url(effort["url"])}
        for effort in data.get("best_efforts", [])
    ]

    moving_time = None
    if seconds is not None:
        minutes = math.floor(seconds / 60)
        moving_time = f"{minutes // 60:,}h {minutes % 60:02d}m"

    return {
        "period": data.get("period"),
        "updated_at": updated_at,
        "updated_label": updated_label,
        "profile_url": profile_url,
        "distance": f"{distance:,.1f}" if distance is not None else None,
        "best_efforts": best_efforts,
        "runs": f"{int(runs):,}" if runs is not None else None,
        "moving_time": moving_time,
        "elevation": f"{elevation:,.0f}" if elevation is not None else None,
    }


def load_running_stats(path):
    return format_running_stats(json.loads(Path(path).read_text()))
