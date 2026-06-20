# Agent Instructions for Soko

## Tech Stack Overview

- **Backend**: Node.js, Express

- **Frontend**: Vanilla JS, HTML5, CSS3 (using Glassmorphism & rich aesthetics)

## Development & Maintenance Guidelines

### 1. Architectural Rules

- **State Isolation**: Do not introduce build tools like Webpack or Vite for the frontend. Stick to vanilla assets served by `express.static('public')`.
- **Network Isolation**: Always explicitly bind the Express server to local addresses (e.g. `127.0.0.1`) rather than `0.0.0.0` unless intended for overlay tunnels.

### 2. Frontend Changes

- Avoid TailwindCSS. Standardize any new components using CSS variables defined in `public/style.css`.
- When adding interactions in `public/app.js`, keep using standard `fetch` APIs.
- Ensure that the premium "Wow factor" (micro-animations, dark mode aesthetics, clean gradients) is maintained.

### 3. File Handling & Safety

- **Multer Adjustments**: If modifying upload logic, ensure the size limit (100MB) is enforced inside the middleware.
- **Spoofed Binaries**: Do not alter the 4KB null-byte inspection routine, as this is a core security requirement.
- **Soft Deletions**: Always rename deleted items to include an ISO-8601-like timestamp string to ensure absolute uniqueness in the `/deleted` repository.

### 4. Scripts

You can utilize standard `package.json` scripts:

- `npm run dev` to boot with `nodemon`.
- `npm run lint` and `npm run format` for automated quality checks.
