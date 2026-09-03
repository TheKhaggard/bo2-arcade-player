from html.parser import HTMLParser
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.scripts = []
        self.stylesheets = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids.add(element_id)
        if tag == "script" and attributes.get("src"):
            self.scripts.append(attributes["src"])
        if tag == "link" and attributes.get("rel") == "stylesheet":
            self.stylesheets.append(attributes.get("href"))


class StaticSiteTests(unittest.TestCase):
    def setUp(self):
        self.html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.javascript = (ROOT / "app.js").read_text(encoding="utf-8")
        self.parser = DocumentParser()
        self.parser.feed(self.html)

    def test_required_files_exist(self):
        for relative_path in (
            "index.html",
            "styles.css",
            "app.js",
            "favicon.svg",
            "README.md",
            "LICENSE",
            "THIRD_PARTY_NOTICES.md",
            ".nojekyll",
        ):
            self.assertTrue((ROOT / relative_path).is_file(), relative_path)

    def test_local_assets_are_referenced(self):
        self.assertIn("styles.css", self.parser.stylesheets)
        self.assertIn("app.js", self.parser.scripts)
        self.assertIn('href="favicon.svg"', self.html)

    def test_interactive_ids_exist(self):
        required_ids = {
            "launcher",
            "romInput",
            "dropZone",
            "validationStatus",
            "startButton",
            "emulatorScreen",
            "exitButton",
            "game",
        }
        self.assertTrue(required_ids.issubset(self.parser.ids))

    def test_emulator_version_and_core_are_pinned(self):
        self.assertIn('const EMULATOR_VERSION = "4.2.3"', self.javascript)
        self.assertIn('window.EJS_core = "mame2003_plus"', self.javascript)

    def test_no_rom_or_disk_assets_are_committed(self):
        blocked_suffixes = {".zip", ".7z", ".rar", ".chd", ".rom", ".bin"}
        blocked = [
            path.relative_to(ROOT)
            for path in ROOT.rglob("*")
            if path.is_file() and path.suffix.lower() in blocked_suffixes
        ]
        self.assertEqual(blocked, [])

    def test_no_remote_rom_url_is_embedded(self):
        suspicious = re.findall(r"https?://[^\"']+\.(?:zip|7z|rar|chd|rom|bin)", self.javascript, re.I)
        self.assertEqual(suspicious, [])


if __name__ == "__main__":
    unittest.main()
