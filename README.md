# Gridly

A general-purpose drag-and-drop grid for arranging cards. Built with React, Tailwind CSS, Vite, Firebase Authentication, and Cloud Firestore.

## Run locally

```bash
npm install
npm run dev
```

Without Firebase configuration, the app runs in **Local preview** mode and stores grids in this browser's local storage. This makes the interface usable before a Firebase project is connected; local grids do not sync or share across devices.

## Connect Firebase

1. Create a Firebase project and a Firestore database.
2. Enable **Anonymous** sign-in in Firebase Authentication.
3. Register a web app, then copy its configuration into `.env.local` using `.env.example` as a guide.
4. Deploy [firestore.rules](firestore.rules) to the Firestore database.
5. Add your GitHub Pages domain to Firebase Authentication's authorized domains.

The app writes each grid to `grids/{shortId}`. The creator's anonymous UID owns the grid. A private grid can be read only by that UID. Enabling sharing allows any signed-in anonymous visitor with the URL to **view** it; only the owner can edit. The short ID has ten random characters. Anonymous identity is tied to a browser profile; clearing its browser data can remove the ability to edit grids created there.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds on pushes to `master` and deploys `dist` to GitHub Pages. Set the repository's Pages source to **GitHub Actions**. Add these repository **variables** in GitHub Actions settings:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Firebase's web configuration is public by design; Firestore rules enforce access. The workflow copies `index.html` to `404.html` so direct visits to a grid URL can load the React router on GitHub Pages.

## Controls

- Create a card by entering its title and pressing Enter; its colour is chosen automatically.
- Drag a card from the sidebar onto the grid, or use **Place** for a non-drag option.
- Drag a placed card to move it. Drag its lower-right corner to resize it.
- Focus a placed card and use arrow keys to move it. Hold Shift with arrow keys to resize.
- Select a card to edit its details and numeric placement.

Run `npm run build` to type-check and build, or `npm run lint` for static checks.
