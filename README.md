# Interactive Neon Flowers

A full-screen procedural neon garden. Click or tap once to grow one flower. The stem grows up from the bottom, the bud emerges, five asymmetric petals unfold in sequence, and the flower sways with its stem. Tab into the garden and press Enter or Space to plant with a keyboard. Reduced-motion mode plants fully open flowers and keeps the garden still.

## Development

Use Node 22 or newer. Run `npm ci`, `npm test`, and `npm run dev`. Run `npm run build` for production, followed by `npm run preview` for a local production build. With Chrome installed, run `npm run qa` in another terminal. Set `GARDEN_BROWSER_CHANNEL=msedge` for Edge, `GARDEN_BROWSER_PATH` for another Chromium executable, or `GARDEN_URL` for the deployed page. Evidence goes into `qa-output/` by default.

## Rendering

Canvas 2D caches procedurally drawn Bézier petal textures, a subtle halo and a pollen center. Overlapping petal transforms, radial lighting and fold gradients create a tilted 2.5D cup. All forms are generated locally. WebGL and external image or font requests are unnecessary. A cubic Bézier ribbon narrows towards the head, with wind displacement increasing quadratically along the stem. The garden uses CSS-pixel coordinates, a resolution cap and frame-time-based quality reduction. It stops drawing in hidden tabs. Once 40 plants are present the oldest fades over 750 ms, with a hard ceiling of 50 including fades. Seeded composition and a QA-only clock make visual comparisons repeatable. Real-time motion remains the default.

## Publish

Create a GitHub repository, select GitHub Actions under Settings → Pages, and push `main`. The included workflow installs from the lockfile, runs unit tests, builds the site and deploys `dist/`. Vite uses a relative base so assets resolve beneath the repository path.
