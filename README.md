# Number Lab Pro

A polished, responsive number guessing game built with **HTML5, CSS3, and Vanilla JavaScript**. No framework, bundler, or installation required.

## Live Link:
 https://vishal-maddheshiya.github.io/Number-guessing-game/
## GitHub Repo:
https://github.com/VISHAL-MADDHESHIYA/Number-guessing-game/

## Features

- Three difficulty levels:
  - Easy: 1–100, 8 attempts
  - Medium: 1–250, 7 attempts
  - Hard: 1–500, 6 attempts
- Random secret number and higher/lower hints
- Validates whole numbers and rejects out-of-range or duplicate guesses
- Attempt counter, recent guesses, and progress indicator
- Win/loss modal and replay flow
- Persistent statistics via `localStorage`
- Win rate, best score, total games, current streak
- Unlockable achievements
- Optional generated sound effects (Web Audio API)
- Keyboard shortcuts: **Enter** submits a guess, **R** starts a new game
- Responsive layout, semantic HTML, accessible labels and reduced-motion support

## Run locally

1. Download or clone this project.
2. Open `index.html` in a modern browser.

For a local server, you can also use VS Code's Live Server extension. No build step is needed.

## Deploy free

### GitHub Pages
1. Create a public GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Wait for the published URL to appear in the Pages section.

### Netlify
Drag the project folder into Netlify's manual deploy area, or connect the GitHub repository.

## Project structure

```text
number-lab-pro/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Core JavaScript concepts demonstrated

- `Math.random()` and `Math.floor()` for inclusive random integers
- Conditionals and validation
- Functions and state objects
- Arrays for guess history and achievements
- DOM selection and manipulation
- Form, button, keyboard, and dialog event handling
- `localStorage` persistence
- Web Audio API for optional sound effects

## Interview questions — sample answers

**How do you generate a random integer in a range?**

`Math.floor(Math.random() * (max - min + 1)) + min` generates an integer from `min` through `max`, inclusive.

**How do you give higher/lower feedback?**

Compare the user's validated guess with the secret target. If the guess is lower, ask them to go higher; if greater, ask them to go lower; if equal, they win.

**How do you reset the game state?**

Create a new game-state object with a new random target, zero attempts, an empty guess list, and `playing` status. Keep saved lifetime statistics separate from round state.

## Notes

- Game statistics are saved in the current browser's local storage on this device. Clearing browser storage removes them.
- Google Fonts are loaded online; the interface has system-font fallbacks.
- This is a front-end learning project and does not send data to a server.
