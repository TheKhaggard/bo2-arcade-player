# BLOOD OATH II

> **The moon is broken. The oath remains. Enter the arena.**

Long ago, the Blood Oath was forged to imprison something that was never meant to walk beneath the moon.

For centuries, the oath held.

Then the moon shattered.

Its fragments fell across the realm like burning stars, corrupting the lands they touched and awakening powers that had been buried since the first age. Kingdoms collapsed. Ancient orders returned from extinction. Warriors began hearing the same voice in their dreams, calling them toward a place that should no longer exist:

**The Blood Arena.**

At its center lies the last fragment of the broken moon, a relic said to grant its victor the power to rewrite a single oath — to restore a fallen kingdom, resurrect the dead, erase a betrayal, claim a throne… or destroy the Blood Oath forever.

Twelve warriors answer the call.

Some come for redemption.
Some for revenge.
Some for power.

And some already know what will happen if the wrong fighter reaches the moon first.

---

## THE TOURNAMENT

The Blood Arena does not exist in one place.

Each battle tears open a path into a different scar left behind by the shattered moon.

Warriors may clash beneath the ruins of the **Shattered Moon Temple**, descend into the flames of the **Infernal Forge**, cross blades within the ancient **Moon Gate Monastery**, hunt one another through the poisonous **Venom Marsh**, and fight across other fragments of a dying world.

Victory alone, however, is not enough.

The Blood Oath demands a final judgment.

When an opponent falls in the decisive round and the arena cries:

> **FINISH THEM!**

the victor may invoke their forbidden technique — an **Oathbreaker**.

An Oathbreaker is more than a finishing move. It is the manifestation of the promise, curse, hatred, or memory that brought that warrior into the tournament.

Every fighter carries a different one.

And every Oathbreaker brings the Blood Oath one step closer to breaking.

---

## THE TWELVE

### Riven — The Exiled Guardian

**Oathbreaker: Soulfall**

Riven once guarded the temple where the original Blood Oath was sealed. When the moon shattered, he was blamed for abandoning his post and cast into exile.

He enters the tournament not to reclaim his honor, but to discover who opened the temple gates from within.

---

### Veyra — The Storm Champion

**Oathbreaker: Tempest Crown**

Veyra was born during the first storm beneath the fractured moon. Lightning answers her anger, and entire armies once fought beneath her banner.

Now the storms whisper the same name every night.

She has come to the arena to find its owner.

---

### Kael — The Ash-Bound Hunter

**Oathbreaker: Ashen Verdict**

Kael hunts creatures born from the moon fragments, carrying the ashes of everyone he failed to save.

His trail has led him to the Blood Arena.

This time, the monster he is hunting may be one of the fighters standing across from him.

---

### Neris — The Frostbound Nomad

**Oathbreaker: White Silence**

The shattered moon froze Neris's homeland in a single night.

She survived.

Nobody else did.

Neris believes the power at the center of the tournament can return her people — and she is willing to bury every other warrior beneath the ice to reach it.

---

### Vance — The Gilded Champion

**Oathbreaker: Final Curtain**

To the crowds, Vance is a legend.

A duelist. A performer. A champion who has never lost when an audience was watching.

But beneath the gold and applause lies a man desperately trying to escape a bargain he made long before the moon broke.

For Vance, the tournament is one final performance.

---

### Orun — The Storm Oracle

**Oathbreaker: Heaven's Break**

Orun has already witnessed the end of the tournament.

Thousands of times.

In almost every future, the world dies.

He has entered the arena searching for the one impossible outcome he has never been able to see.

---

### Serika — The Blood-Moon Fang

**Oathbreaker: Violet Maw**

Serika does not fear the corruption of the shattered moon.

She worships it.

To her, the catastrophe was not the end of the world but the beginning of its transformation.

She intends to make sure the Blood Oath never seals that power away again.

---

### Ilyra — The Fallen Sky Heir

**Oathbreaker: Last Breath**

Ilyra was once heir to a kingdom suspended above the clouds.

Then a moon fragment tore through its heart.

Her kingdom fell from the sky.

Ilyra survived the fall, and she has spent every day since searching for the person who caused it.

---

### Dravok — The Dethroned Tyrant

**Oathbreaker: Tyrant's Eclipse**

Dravok once ruled through fear until his own generals dragged him from his throne.

The broken moon has given him something armies never could:

A second chance.

He does not intend to win his kingdom back.

He intends to build a greater one from whatever survives the tournament.

---

### Sythra — The Venom Marsh Hunter

**Oathbreaker: Venom Bloom**

When moonlight poisoned the marshes, the creatures within began to change.

So did Sythra.

She has learned to survive the venom flowing through the land — but every battle pushes the corruption deeper into her body.

The power hidden within the arena may be her cure.

Or her final mutation.

---

### Gorrak — The Ash-Waste Hunter

**Oathbreaker: Obsidian Shear**

Beyond the Infernal Forge lies a wasteland where moon fragments turned sand into black glass.

Gorrak has wandered it for years, hunting those who harvest the fragments for power.

Now every trail leads to the same place.

The arena.

---

### Mara Voss — The Frontier Commando

**Oathbreaker: Breach Protocol**

Mara does not believe in prophecies, curses, forgotten gods, or sacred tournaments.

She believes in objectives.

Something inside the Blood Arena is generating an energy signature powerful enough to destabilize the remaining moon fragments.

Her mission is simple:

Enter. Identify the source. Neutralize it.

Nobody told her the source might be alive.

---

## ENTER THE ARENA

**[Play Blood Oath II on GitHub Pages →](https://thekhaggard.github.io/bo2-arcade-player/)**

Blood Oath II runs directly in a modern browser. There are no installers, downloads, emulators, or ROM files.

Choose a warrior.

Choose an arena.

Break the oath.

---

## GAMEPLAY

Blood Oath II is an original dark-fantasy 2D arcade fighter built entirely with HTML, CSS, and JavaScript.

The game features twelve playable fighters, each with distinct speed, power, and movement characteristics. Fight through single-player battles against randomly selected adaptive rivals, challenge another player locally on the same keyboard, or connect two gamepads through the browser Gamepad API.

Battles are fought across multiple selectable arenas, including **Shattered Moon Temple**, **Infernal Forge**, **Moon Gate Monastery**, and **Venom Marsh**, with an additional random-stage option.

Matches use a best-of-three round system with a timer, jumping, blocking, four attack types, hit reactions, knockouts, and character-specific interactive **Oathbreaker** finishers at the end of the decisive round.

The AI rival uses defensive reads and deliberate attack recovery rather than simply attacking continuously, while each arena carries its own synthesized match music, ambience, and arcade sound effects through the Web Audio API.

The game also includes runtime sprite isolation to keep attack frames contained within their atlas cells and remove detached sprite fragments, fullscreen support, pause and resume controls, and a responsive physical arcade-cabinet presentation.

There are **no runtime dependencies**.

---

## CONTROLS

| Action         | Player 1        | Player 2    | Gamepad            |
| -------------- | --------------- | ----------- | ------------------ |
| Move           | `W` `A` `S` `D` | Arrow keys  | Left stick / D-pad |
| High punch     | `F`             | `J`         | Face button        |
| Low punch      | `V`             | `M`         | Face button        |
| Block          | `G`             | `K`         | Left shoulder      |
| High kick      | `H`             | `L`         | Face button        |
| Low kick       | `N`             | `.`         | Face button        |
| Pause / resume | `P` / `Esc`     | `P` / `Esc` | Start              |

When **FINISH THEM!** appears, the winning player can press any attack button to unleash that fighter's **Oathbreaker**.

The illuminated **PAUSE / RESUME** controls both inside and beneath the fight screen provide the same functionality with a mouse or touchscreen.

---

> **Twelve warriors. Four arenas. One broken moon.**
> **Only one oath will survive.**
