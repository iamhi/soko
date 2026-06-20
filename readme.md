# Markdown Vault

This is a self-contained Markdown Storage Service. It is a Node.js/Express backend that serves a native Vanilla JavaScript user interface, utilizing filesystem operations for localized data storage.

## Features

- **Upload and Ingest**: Support for `.md` files (up to 100MB payload limit).
- **Soft Delete Architecture**: Files are moved to a `deleted` directory instead of being permanently removed, with timestamps appended to prevent collisions.
- **Spoofed Binary Detection**: A 4KB header check prevents malicious binary payloads disguised as `.md` files.
- **Collision Resolution**: Automatic filename incrementing to prevent accidental document overwrites.

## Setup

1. Ensure Node.js is installed.
2. Run `npm install` to install dependencies.
3. Run `npm start` to start the backend service.
4. Access the user interface via your browser at `http://127.0.0.1:3000`.

## Scripts

- `npm start`: Runs the server (`node server.js`).
- `npm run dev`: Runs the server with auto-reloading (`nodemon server.js`).
- `npm run lint`: Lints the codebase.
- `npm run format`: Formats code via Prettier.
