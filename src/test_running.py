import unittest

from running_stats import format_running_stats


class RunningLinkTests(unittest.TestCase):
    def test_normalizes_both_links_without_changing_the_snapshot(self):
        link = "HTTPS://WWW.STRAVA.COM:443/activities/1?share=yes#details"
        canonical = "https://www.strava.com/activities/1?share=yes#details"
        snapshot = {"profile_url": link, "best_efforts": [{"url": link}]}
        result = format_running_stats(snapshot)
        self.assertEqual(result["profile_url"], canonical)
        self.assertEqual(result["best_efforts"][0]["url"], canonical)
        self.assertEqual(snapshot["best_efforts"][0]["url"], link)

    def test_rejects_ambiguous_and_off_origin_links_in_both_fields(self):
        for link in (
            r"https://outside.invalid\@www.strava.com/activities/1",
            "https://outside.invalid@strava.com/",
            "https://strava.com@outside.invalid/",
            "https://strava.com:8443/",
            "https://www.strava.com.invalid/",
            "https://stra\tva.com/",
            "https://strava.com/\r\n",
            "http://strava.com/",
            "//strava.com/",
        ):
            for snapshot in ({"profile_url": link}, {"best_efforts": [{"url": link}]}):
                with self.subTest(snapshot=snapshot), self.assertRaises(ValueError):
                    format_running_stats(snapshot)
