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
            "assets/arena-infernal-forge.png",
            "assets/arena-moon-gate.png",
            "assets/arena-venom-marsh.png",
            "assets/riven-sprites.png",
            "assets/veyra-sprites.png",
            "assets/kael-sprites-v3.png",
            "assets/neris-sprites-v3.png",
            "assets/vance-sprites.png",
            "assets/orun-sprites-v2.png",
            "assets/serika-sprites-v2.png",
            "assets/ilyra-sprites.png",
            "assets/dravok-sprites.png",
            "assets/sythra-sprites.png",
            "assets/gorrak-sprites.png",
            "assets/mara-sprites.png",
            "assets/logo-blood-oath-ii.png",
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
            "arena-infernal-forge.png",
            "arena-moon-gate.png",
            "arena-venom-marsh.png",
            "riven-sprites.png",
            "veyra-sprites.png",
            "kael-sprites-v3.png",
            "neris-sprites-v3.png",
            "vance-sprites.png",
            "orun-sprites-v2.png",
            "serika-sprites-v2.png",
            "ilyra-sprites.png",
            "dravok-sprites.png",
            "sythra-sprites.png",
            "gorrak-sprites.png",
            "mara-sprites.png",
            "logo-blood-oath-ii.png",
        ):
            self.assertIn(asset, self.html + (ROOT / "src/config.js").read_text(encoding="utf-8"))

    def test_interactive_ids_exist(self):
        required_ids = {
            "gameCanvas",
            "loadingOverlay",
            "titleOverlay",
            "selectOverlay",
            "stageOverlay",
            "resultOverlay",
            "fightButton",
            "soundButton",
            "pauseButton",
            "matchPauseButton",
            "stageBackButton",
            "fullscreenButton",
            "helpButton",
        }
        self.assertTrue(required_ids.issubset(self.parser.ids))

    def test_game_modules_are_connected(self):
        for module in ("./src/audio.js", "./src/config.js", "./src/game.js", "./src/input.js"):
            self.assertIn(module, self.javascript)
        self.assertIn("new ArenaGame", self.javascript)
        self.assertIn("startMatch", self.javascript)

    def test_full_roster_random_p2_and_animated_finishers_are_present(self):
        config = (ROOT / "src/config.js").read_text(encoding="utf-8")
        game = (ROOT / "src/game.js").read_text(encoding="utf-8")
        for fighter in ("riven", "veyra", "kael", "neris", "vance", "orun", "serika", "ilyra", "dravok", "sythra", "gorrak", "mara"):
            self.assertIn(f'id: "{fighter}"', config)
            self.assertIn(f'data-character="{fighter}"', self.html)
        self.assertEqual(self.html.count('data-character="'), 12)
        self.assertEqual(self.html.count('data-stage="'), 5)
        self.assertIn("randomOpponent", self.javascript)
        self.assertIn('phase = "finishPrompt"', game)
        self.assertIn("performFinisher", game)
        self.assertIn("finisherPresentation", game)
        self.assertIn("drawLightning", game)
        self.assertIn("isolateSpriteAtlas", game)
        self.assertIn("cleanedFragments", game)
        self.assertIn("FINISH THEM!", game)
        self.assertIn("togglePause", game)
        self.assertIn("attackCooldown", game)
        self.assertIn("retreatTimer", game)
        self.assertIn("STAGES", game)

    def test_stage_selection_music_and_p2_copy_are_connected(self):
        audio = (ROOT / "src/audio.js").read_text(encoding="utf-8")
        combined = self.html + self.javascript + (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("openStageSelect", self.javascript)
        self.assertIn("startMusic", self.javascript)
        self.assertIn("startMusic(stage", audio)
        self.assertIn("setMusicPaused", audio)
        self.assertNotIn("CPU", combined)
        self.assertIn('id="playerTwoLabel">P2', self.html)

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
