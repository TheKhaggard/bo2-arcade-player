# BLOOD OATH II

> **The moon is broken. The oath remains. Enter the arena.**

Blood Oath II is an original dark-fantasy 2D arcade fighter that runs instantly in a modern browser. There are no installers, downloads, emulators, or ROM files: open the page, choose a warrior, and fight.

## Play now

**[Enter the arena on GitHub Pages →](https://thekhaggard.github.io/bo2-arcade-player/)**

## Features

- Eight original playable fighters with distinct speed, power, and movement profiles
- Single-player battles against a randomly selected adaptive CPU rival
- Local two-player versus on one keyboard
- Two-gamepad support through the browser Gamepad API
- Best-of-three rounds, timer, jumping, blocking, four attacks, hit reactions, and knockouts
- Interactive **Oathbreaker** finishers at the end of the final round
- Original synthesized arcade sound effects through the Web Audio API
- Fullscreen support and a responsive physical arcade-cabinet presentation
- Pure HTML, CSS, and JavaScript with no runtime dependencies

## Roster

| Fighter | Title | Oathbreaker |
|---|---|---|
| Riven | The Exiled Guardian | Soulfall |
| Veyra | The Storm Champion | Tempest Crown |
| Kael | The Ash-Bound Hunter | Ashen Verdict |
| Neris | The Frostbound Nomad | White Silence |
| Vance | The Gilded Champion | Final Curtain |
| Orun | The Storm Oracle | Heaven's Break |
| Serika | The Blood-Moon Fang | Blood Moon |
| Ilyra | The Fallen Sky Heir | Last Breath |

## Controls

| Action | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Move | `W` `A` `S` `D` | Arrow keys | Left stick / D-pad |
| High punch | `F` | `J` | Face button |
| Low punch | `V` | `M` | Face button |
| Block | `G` | `K` | Left shoulder |
| High kick | `H` | `L` | Face button |
| Low kick | `N` | `.` | Face button |
| Pause | `P` / `Esc` | `P` / `Esc` | Start |

When **FINISH THEM!** appears, the winning player can press any attack button to perform that fighter's Oathbreaker.

## Run locally

The game uses native ES modules, so serve the project through a small HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Development

Run the static checks with:

```bash
python3 -m unittest discover -s tests -v
```

Every commit pushed to `main` is tested by GitHub Actions and automatically deployed to GitHub Pages.

## Why this game is original

Commercial fighting-game ROMs, characters, artwork, audio, and other copyrighted assets cannot be redistributed through this repository. Blood Oath II was therefore built from scratch as a copyright-safe tribute to the atmosphere and physical presentation of 1990s arcade fighters.

Its world, names, character designs, code, visual assets, audio, and finisher system are original. This project is not affiliated with Mortal Kombat, Warner Bros., or any other game publisher or rights holder.

The source code is available under the [MIT License](LICENSE). See [Third-Party and Asset Notices](THIRD_PARTY_NOTICES.md) for asset details.
