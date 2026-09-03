from html.parser import HTMLParser
from pathlib import Path
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
        if attributes.get("id"):
            self.ids.add(attributes["id"])
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
            "src/config.js",
            "src/input.js",
            "src/audio.js",
            "src/game.js",
            "assets/arena-moon-temple.png",
            "assets/riven-sprites.png",
            "assets/veyra-sprites.png",
            "assets/kael-sprites.png",
            "assets/neris-sprites.png",
            "assets/vance-sprites.png",
            "assets/orun-sprites.png",
            "assets/serika-sprites.png",
            "assets/ilyra-sprites.png",
            "README.md",
            "LICENSE",
            "THIRD_PARTY_NOTICES.md",
            ".nojekyll",
        ):
            self.assertTrue((ROOT / relative_path).is_file(), relative_path)

    def test_local_assets_are_referenced(self):
        self.assertIn("styles.css", self.parser.stylesheets)
        self.assertIn("app.js", self.parser.scripts)
        for asset in (
            "arena-moon-temple.png",
            "riven-sprites.png",
            "veyra-sprites.png",
            "kael-sprites.png",
            "neris-sprites.png",
            "vance-sprites.png",
            "orun-sprites.png",
            "serika-sprites.png",
            "ilyra-sprites.png",
        ):
            self.assertIn(asset, self.html + (ROOT / "src/config.js").read_text(encoding="utf-8"))

    def test_interactive_ids_exist(self):
        required_ids = {
            "gameCanvas",
            "loadingOverlay",
            "titleOverlay",
            "selectOverlay",
            "resultOverlay",
            "fightButton",
            "soundButton",
            "fullscreenButton",
            "helpButton",
        }
        self.assertTrue(required_ids.issubset(self.parser.ids))

    def test_game_modules_are_connected(self):
        for module in ("./src/audio.js", "./src/config.js", "./src/game.js", "./src/input.js"):
            self.assertIn(module, self.javascript)
        self.assertIn("new ArenaGame", self.javascript)
        self.assertIn("startMatch", self.javascript)

    def test_full_roster_random_cpu_and_finisher_are_present(self):
        config = (ROOT / "src/config.js").read_text(encoding="utf-8")
        game = (ROOT / "src/game.js").read_text(encoding="utf-8")
        for fighter in ("riven", "veyra", "kael", "neris", "vance", "orun", "serika", "ilyra"):
            self.assertIn(f'id: "{fighter}"', config)
            self.assertIn(f'data-character="{fighter}"', self.html)
        self.assertIn("randomOpponent", self.javascript)
        self.assertIn('phase = "finishPrompt"', game)
        self.assertIn("performFinisher", game)
        self.assertIn("FINISH THEM!", game)

    def test_player_facing_copy_is_english(self):
        self.assertIn('<html lang="en">', self.html)
        for forbidden in ("OYUNCU", "DÖVÜŞ", "KONTROLLER", "TAM EKRAN", "SES: AÇIK"):
            self.assertNotIn(forbidden, self.html + self.javascript)

    def test_no_emulator_or_rom_loader_remains(self):
        combined = self.html + self.javascript
        for forbidden in ("EmulatorJS", "mame2003", "romInput", "mk2.zip", "EJS_core"):
            self.assertNotIn(forbidden, combined)

    def test_no_rom_or_disk_assets_are_committed(self):
        blocked_suffixes = {".zip", ".7z", ".rar", ".chd", ".rom", ".bin"}
        blocked = [
            path.relative_to(ROOT)
            for path in ROOT.rglob("*")
            if path.is_file() and path.suffix.lower() in blocked_suffixes
        ]
        self.assertEqual(blocked, [])


if __name__ == "__main__":
    unittest.main()
