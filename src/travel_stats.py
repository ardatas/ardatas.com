"""Country-based exploration, using UN members and observer states (195).

Continents follow UN M49, splitting the Americas into North/South America.
Türkiye is assigned to Asia and Russia to Europe, without double counting.
Sources: https://unstats.un.org/unsd/methodology/m49/
         https://www.un.org/en/about-us
"""
from collections import Counter

COUNTRY_TOTALS = {
    "Africa": 54,
    "Asia": 48,
    "Europe": 44,
    "North America": 23,
    "South America": 12,
    "Oceania": 14,
}


def build_exploration_stats(countries):
    visited = {}
    for country in countries:
        if not country["cities"]:
            continue
        continent = country["continent"]
        if continent not in COUNTRY_TOTALS:
            raise ValueError(f"Unknown continent for {country['name']}: {continent}")
        visited[country["id"]] = continent

    def stat(name, count, total):
        return {"name": name, "visited": count, "total": total,
                "percent": round(100 * count / total, 1)}

    stats = [stat("World", len(visited), sum(COUNTRY_TOTALS.values()))]
    counts = Counter(visited.values())
    for continent, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        stats.append(stat(continent, count, COUNTRY_TOTALS[continent]))
    return stats
