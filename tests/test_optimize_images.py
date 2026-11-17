import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import optimize_images


class ImageBuildTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        previous = Path.cwd()
        self.addCleanup(os.chdir, previous)
        os.chdir(directory.name)
        Path('dist/assets').mkdir(parents=True)
        Path('dist/assets/photo.png').write_bytes(b'original')
        Path('dist/assets/existing.webp').write_bytes(b'already optimized')
        self.html = Path('dist/index.html')
        self.original = '<img src="/assets/photo.png"><img src="/assets/existing.webp">'
        self.html.write_text(self.original)

    def test_encoder_failure_preserves_originals_and_html_and_fails_build(self):
        with patch('optimize_images.subprocess.run', side_effect=subprocess.CalledProcessError(1, 'cwebp')):
            with self.assertRaises(subprocess.CalledProcessError):
                optimize_images.main()
        self.assertEqual(self.html.read_text(), self.original)
        self.assertEqual(Path('dist/assets/photo.png').read_bytes(), b'original')

    def test_success_rewrites_only_after_conversion_and_skips_existing_webp(self):
        def convert(command, **kwargs):
            self.assertEqual(self.html.read_text(), self.original)
            self.assertTrue(Path('dist/assets/photo.png').exists())
            Path(command[command.index('-o') + 1]).write_bytes(b'converted')
        with patch('optimize_images.subprocess.run', side_effect=convert) as run:
            optimize_images.main()
        self.assertEqual(run.call_count, 1)
        self.assertIn('/assets/photo.png.webp', self.html.read_text())
        self.assertNotIn('existing.webp.webp', self.html.read_text())
        self.assertFalse(Path('dist/assets/photo.png').exists())
        self.assertEqual(Path('dist/assets/existing.webp').read_bytes(), b'already optimized')

if __name__ == '__main__':
    unittest.main()
