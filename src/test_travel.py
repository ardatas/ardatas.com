"""Guard the supplied travel inventory and its public static-page fallback."""
import json
from pathlib import Path
import unittest

from jinja2 import Environment, FileSystemLoader, select_autoescape
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent


class TravelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.travel = json.loads((ROOT / 'data/travel.json').read_text())
        cls.countries = cls.travel['countries']
        cls.cities = [city for country in cls.countries for city in country['cities']]

    def test_complete_inventory(self):
        self.assertEqual({c['name']: len(c['cities']) for c in self.countries}, {
            'Türkiye': 23, 'Greece': 1, 'Bulgaria': 1, 'Italy': 11,
            'Croatia': 1, 'Austria': 1, 'Czechia': 1, 'Switzerland': 1,
            'Germany': 14, 'Kyrgyzstan': 1, 'Estonia': 1, 'Latvia': 2,
        })
        self.assertEqual(len(self.cities), 58)
        self.assertEqual(len({c['id'] for c in self.cities}), 58)
        self.assertEqual({c['name']: c['base'] for c in self.cities if c['base']}, {
            'Munich': 'home', 'Istanbul': 'second',
        })
        self.assertNotIn('Bielefeld', {c['name'] for c in self.cities})
        self.assertEqual(self.travel['easterEgg']['name'], 'Bielefeld')

    def test_coordinates_and_country_focus(self):
        for place in self.countries + self.cities + [self.travel['easterEgg']]:
            with self.subTest(place=place['name']):
                self.assertTrue(-90 <= place['lat'] <= 90)
                self.assertTrue(-180 <= place['lon'] <= 180)
        for country in self.countries:
            self.assertTrue(0.065 < country['altitude'] < 0.68)

    def test_every_place_readable_without_javascript(self):
        env = Environment(loader=FileSystemLoader(ROOT / 'templates'),
                          autoescape=select_autoescape(['html']))
        # Use the same fieldset macro as the home page.
        template = env.from_string('{% from "components/fieldset.html" import fieldset %}'
                                   '{% include "components/travel.html" %}')
        soup = BeautifulSoup(template.render(travel=self.travel), 'html.parser')
        listed = soup.select('.travel-place-list li')
        self.assertEqual(len(listed), 58)
        for city in self.cities:
            self.assertTrue(any(item.get_text().startswith(city['name']) for item in listed))
        self.assertEqual(json.loads(soup.select_one('#travel-data').string), self.travel)
        self.assertEqual(len(soup.select('[data-country]')), 12)


if __name__ == '__main__':
    unittest.main()
