# Drag-and-drop grid app: initial requirements

Build a responsive app for creating grids and arranging cards on them. Grids have no built-in meaning or calendar structure. Users choose any positive number of rows and columns, optional labels, visible cell lines, and drag snap increment. Snapping is expressed in cell units: users can choose ¼, ½, 1, 2, or 3, or enter another positive value. Visible lines and snap points are separate settings. A grid can be renamed and reconfigured without losing its cards.

The starting screen defaults to a blank custom grid. Day and week are optional presets that prefill dimensions, labels, and snap settings. An eight-hour day could use eight hourly rows and quarter-row snapping. Users can change every preset value and build unrelated layouts such as project boards, seating plans, or inventories.

Card creation is immediate: enter a title and press Enter. Each new card receives a random, readable colour. Cards can be dragged onto the grid, moved, resized to snap points, and removed. Selecting a card opens an edit pane for its title, colour, optional description, and optional link. Available space and overlaps should be clear, with a keyboard or form-based way to place cards.

Use the existing React, Tailwind, and Vite app, with Firebase persistence and anonymous sign-in. Each grid has a short URL ID. Sharing is optional and has an explicit access rule; the ID alone should not grant access to a private grid. Deploy to GitHub Pages. The first release focuses on fast setup, quick card entry, reliable snapping, and autosave.
