# Code Mafia — Dedicated Backend Server

This directory contains the dedicated Node.js Express/HTTP backend server for the **Code Mafia** platform.

## 🚀 Running the Backend Server

```bash
cd Backend
npm install
npm run dev
```

The server will start on `http://localhost:3001`.

## 📡 API Endpoints Summary

- **`GET /api/health`**: Server health check and active session metrics.
- **`POST /api/v1/sessions`**: Create a new multiplayer session and room Join Code.
- **`GET /api/v1/sessions/:id`**: Retrieve public session state.
- **`GET /api/v1/events/:roomId`**: Real-time SSE event stream connection.
- **`POST /api/v1/events/:roomId`**: Broadcast real-time code edit or game state events.
- **`GET /api/v1/history`**: Retrieve recorded match telemetry history.
- **`POST /api/v1/history`**: Record completed match telemetry.
- **`POST /api/v1/ast/scan`**: Perform static AST analysis on code snippets.
