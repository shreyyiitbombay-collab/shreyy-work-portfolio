# shreyy.work — portfolio

Open `index.html` (double-click works, no build or server needed).

## Fonts
| Where | Font |
|---|---|
| Hero rotating word | Roman Avenue |
| Section headings (Work, Away from my desk, Achievements, My playground), hobby captions, playground project title, footer wordmark | Transcity |
| Everything else | DM Sans 400 / 700 |

Footer wordmark: your design screenshot is drawn in Transcity, so that's the default.
To use Roman Avenue instead, in `css/style.css` set `--ff-wordmark:var(--ff-ra)` (search `--ff-wordmark`).

⚠ `Transcity DEMO.otf` is a personal-use demo (see `assets/fonts/Transcity-LICENSE.txt`).
Buy the full license before using it on a site that helps you earn work/income.

## Swap in your own content (keep the same file names)
- `assets/img/work/*`            Work grid cards (5)
- `assets/img/about/photo-main.png`  Your cut-out photo (used as-is; a black silhouette copy sits under it so no glow shows through)
- `assets/img/about/hie-im-shrestha.svg`  "Hie! I'm Shrestha" + cat heading (vector)
- `assets/img/about/hobby-*.svg`  The 6 hobby cards (each SVG = photo + glow + caption). Position/tilt: `.hob--cats` etc. in css/style.css
- `assets/img/achievements/*`    Achievement images + logos
- `assets/img/buttons/*.svg`     Source artwork of the 4 SVG buttons, each 48px (3rem) tall: `resume-sticky.svg` (floating Resume),
                                 `see-more-projects.svg` (under Work), `linkedin.svg` + `resume.svg` (bottom). They only draw the label +
                                 arrow (flat pill background removed); the button body is the same glass + refraction as "Back to top".
                                 The page uses an INLINE copy of each (letters split so they roll on hover like the other labels, same
                                 timing/easing: `ROLL_*` in js/main.js). To change a label: replace the SVG here, then run
                                 `python3 tools/build_svg_buttons.py --write` (and set `--ar` = width/48 on the button in index.html).
- `assets/img/playground/*`      Playground carousel covers (1204×768 PNGs exported from your SVG covers; shown at 1.57:1; keep the same
                                 file names). Currently 4 projects: Surbahaar, Type design, Extension board, Suitcase extractor.
                                 ADD A PROJECT: copy one `<a class="ring__card" ...>` block in index.html (set href, data-title,
                                 data-meta, data-desc and the img). The ring supports any number of cards; no JS/CSS change.
                                 (With fewer than 5 cards, js/main.js adds hidden look-alike "twins" so the far slots stay filled.)
                                 Side-card tilt/stretch: `G.ang` and `G.sx` in js/main.js (raise them for a stronger 3D look).
                                 Ring behaviour (js/main.js, section 6): autoplay advances every 2.5s · hovering ANY card holds the ring until the cursor
                                 leaves (a slide already in motion finishes its glide first) · click + drag anywhere on the ring (or side-scroll on a
                                 trackpad / shift+wheel) spins it: it follows the pointer, glides on with momentum (`clamp(v * 480, -4, 4)` cards) and rests
                                 with a card centred. EVERY card (centre or side) is a direct link and shows the "view case study" cursor; a drag
                                 never counts as a click.
                                 Hovering a card fades in a soft background glow made from that card's own artwork (`.ring__card::before` in
                                 css/style.css: `blur` = spread, `opacity` = strength; it is kept tight on purpose).
                                 Project detail text (name/meta/description) is 0.9x: change `--pt` on `.play__info`.
- `assets/logos/logo-strip.svg`  Scrolling logo strip (your 9-logo strip, 2002x74; shown 1:1 at 74px tall).
                                 View area: `.marquee` in css/style.css (75.625rem wide, centred). Loop gap + speed: `.marquee__track`
                                 (gap 66px, 54.1s per loop ≈ 38px/s).
                                 Embedded PNGs inside it were resampled to 4× display size (3.7MB → 0.4MB, same look).
- `assets/cat.gif`               Cat gif above the footer (your tenor.gif, bundled). If it ever fails to load the page falls back to the
                                 Tenor link, then to `assets/cat-still.png`.
- `assets/resume.pdf`            Resume (your Shrestha_Resume_1.pdf; both Resume buttons open it)
All current images are crops from your design screenshot — replace with originals for full sharpness.

## Links
Search `TODO-LINK` in `index.html` and paste your Behance / LinkedIn / Instagram URLs.
Playground captions (title, category, description) are the `data-*` attributes on each `.ring__card`.

## Behaviour
- Nav links land their heading at the same spot (ink top 157px at 1440 wide, ~33px under the nav). "About" now goes to "Away from my desk";
  to point it at the intro paragraph instead, change `id="about"` on the heading to `id="intro"` and swap the two ids.
- Hover text roll (from your reference video) on all nav links, buttons and dropdown items: each letter rolls up while its twin
  rolls in from below, left → right, once on hover-in only (no second roll when the pointer leaves). Only the text moves
  (no background/lift/fade changes). Soft timing: `ROLL_MS` (0.52s per letter) and `ROLL_STEP` (26ms between letters) in
  js/main.js; gentle easing `ROLL_EASE`. For a faster roll lower those two numbers.
  Icons (arrows/chevron) stay still. Skipped on touch devices and when the OS asks for reduced motion.
- Work cards: a black panel sits behind the whole card grid (no dotted grid / cursor glow in the gaps), and an edge glow lights the
  border nearest the pointer (inside or outside the card, ~120px reach): a thin warm-white rim with a very soft, tight bloom and a faint lavender haze (subtle). Tune it in css/style.css
  (".Edge glow on the Work cards": colours, rim thickness, bloom) and `reach` in js/main.js. Mouse/pen only (no glow on touch).
- Cat game (js/cats.js): text-made cats float in the empty gaps below the bio and below the Achievements cards (only while a gap
  is on screen). A new cat every 2.2–4.8s (random, max 4 at once). About 70% of cats cross the gap, randomly left → right or
  right → left, at a changing pace (they speed up, slow down, hesitate, sometimes slip back a little) while drifting up and down,
  and fade out at the far side; the rest roam around quickly and float away after ~7–10s. Click/tap to pop: "+10 points"
  floats up and fades; 3 pops (30 points) = "yay, you won!" with confetti, then the game ends until the page is reloaded.
  "Pop me to win" shows under the 1st cat and then every 3rd (1, 4, 7 …). All numbers are in SETTINGS at the top of js/cats.js
  (`GAP` = time between cats, `CROSS_SHARE` = how many cross vs roam, `CROSS_TIME` = crossing speed, `DART` / `SLIP_BACK` = how erratic).
  The cats' tail glyph (ʃ) comes from assets/fonts/CatTail.woff2 (a 1-glyph Noto Sans subset, SIL OFL; see CatTail-LICENSE.txt).
- Top panel labels are a "negative" of what is behind them (white text turns dark over white artwork, stays white over black).
  The panel is 4 stacked fixed layers (glass / inverting text / tint / avatar) so the text can blend with the page; see the
  "Top panel" comment in css/style.css. `--nav-sat` (css, default .3) = how much colour the glass behind the labels keeps:
  0 = fully neutral labels, 1 = natural colours (inverting a colour gives a loud colour, e.g. lime over purple).
- Glass (nav, dropdown, "Back to top", the SVG buttons) refracts what is behind it in Chrome/Edge/Brave/Opera via SVG filters in index.html
  (strength: `data-base` on each `<feDisplacementMap>`; bigger = more bend). Safari/Firefox get the blurred glass instead.
- Nav + Resume are sticky from hero to the end of Playground, then release (outro has none).
- Layout is drawn at 1440px and scales proportionally on desktop; separate 390px layout under 820px.
- Hero word rolls every 1.2s.
- Playground ring switches project every 2.5s (1.0s slide + 1.5s rest; edit `SLIDE_MS` / `REST_MS` in js/main.js), starting at page load so
  it is already mid-cycle when you scroll to it, and it keeps going while the mouse is over it. Click a card on the RIGHT to go
  forward, a card on the LEFT to come back, the centre card (or its title) to open the project. ← / → keys and swipe also work.
  Pauses only when the tab is hidden.
- Hovering "Socials" opens the dropdown (it closes when the pointer leaves); clicking pins it open; scrolling, Esc or an outside click closes it.
- Testing helpers: `?roll=2`, `?ring=1`, `?lit=1` freeze the roller, ring, or text reveal.
