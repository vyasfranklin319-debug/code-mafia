# Code Mafia: 7-Slide Presentation Deck
**Theme**: Cyberpunk Developer Experience / Multiplayer Social Deduction

---

## Slide 1: Title & Executive Hook
### **Code Mafia: Where Debugging Meets Social Deduction**
*Collaborative Coding Arena for High-Stakes Engineering & Covert Sabotage*

* **Subtitle**: A Real-Time Multiplayer Web Platform Gamifying Code Quality, Git Telemetry, and Social Deduction
* **Presenter**: Engineering Team
* **Live Demo**: [https://codemafia-54284.web.app](https://codemafia-54284.web.app)
* **GitHub**: [https://github.com/vyasfranklin319-debug/code-mafia](https://github.com/vyasfranklin319-debug/code-mafia)

**Visual Layout**:
* Left: High-contrast title with neon-purple glowing badges (`MULTIPLAYER`, `DEV GAMIFICATION`, `CLOUD-NATIVE`).
* Right: Hero screenshot of the live IDE battlegrid showing the Monaco Editor, Test Suite Telemetry, and Live Activity Stream.

**Speaker Notes**:
> "Traditional technical interviews and coding bootcamps are dry and solitary. Code Mafia flips engineering education on its head: imagine 'Among Us' built directly inside VS Code. Developers work together against the clock to fix broken test suites, while covert saboteurs sneak in subtle regressions, memory leaks, and syntax traps."

---

## Slide 2: The Problem & The Solution
### **Transforming Developer Skill Evaluation & Team Dynamics**

| The Problem in Tech Today | How Code Mafia Solves It |
| :--- | :--- |
| **Boring Code Assessments**: LeetCode-style puzzles fail to evaluate code auditing, Git collaboration, and bug triage skills. | **Realistic Codebases**: Players debug real-world full-stack packs (Task Master API, Inventory Pricing, Auth Limiters). |
| **Lack of True Team Collaboration**: Most platforms are single-player drills with no social or adversarial dimension. | **Social Deduction Dynamics**: Operatives must communicate, review PRs, and sniff out bad-faith commits under pressure. |
| **High Latency / Clunky Tools**: Collaborative coding often suffers from complex setups or sluggish syncing. | **Sub-100ms Edge Multiplayer**: Instant multi-client synchronization powered by Firebase Realtime DB & Cloudflare Workers. |

**Visual Layout**:
* 2-column comparative layout with red exclamation cards on the left (Problems) transforming into emerald checkmark cards on the right (Solutions).

**Speaker Notes**:
> "We recognized two major gaps: developers don't just write code; they audit, review pull requests, and debug edge cases under time pressure. Code Mafia evaluates authentic engineering skills like commit inspections, test-driven hotfixes, and analytical deduction in a thrilling team format."

---

## Slide 3: Core Gameplay Loop & Mechanics
### **The 5-Phase Battle Cycle**

1. **Role Reveal (Covert Assignment)**:
   * **Operatives (Engineers)**: Goal is to repair codebase bugs and achieve 100% test pass rate.
   * **Saboteurs (Mafia)**: Covertly activate Memory Leaks, Silent Regressions, and Syntax Masking without detection.
2. **Work Round (Timed IDE Sprint)**:
   * Live in-browser editing via **Monaco Editor** with syntax highlighting and hot reload.
   * Real-time **Test Runner Sandbox** executing test suites and streaming pass rates.
   * **AST Sentinel Scanner** measuring algorithmic complexity, infinite loops, and exception swallowing.
3. **Discussion & PR Auditing**:
   * Team opens interactive PR hotfix diffs and commit timelines to trace suspect code modifications.
4. **Emergency Voting**:
   * Timed voting tribunal to eliminate suspected saboteurs.
5. **Dynamic Win Conditions**:
   * Operatives win by 100% test completion or eliminating all Mafia.
   * Mafia wins by reducing codebase integrity to 0% or outnumbering engineers.

**Visual Layout**:
* Circular timeline diagram with glowing neon state indicators and screenshots of the Role Reveal Card and Monaco IDE.

**Speaker Notes**:
> "Each match runs in rapid 15–20 minute cycles across 5 distinct phases. During the work round, every keystroke and Git commit is tracked. When the discussion begins, players use our interactive diff viewer to cross-examine suspect commits like digital detectives."

---

## Slide 4: Deep Technical Architecture
### **Dual-Path Sync & Cloud-Native Edge Infrastructure**

* **Client Architecture**: React 18, TypeScript, Monaco Editor API, TailwindCSS custom Design System.
* **Presence & Room Discovery**: Firebase Realtime Database with native `onDisconnect()` handlers—guarantees zero ghost players and sub-100ms lobby discovery with zero quota exhaustion.
* **Low-Latency Edge Messaging**: Cloudflare Workers with **Durable Objects (`GameRoom`)** providing native WebSockets and peer-to-peer browser `BroadcastChannel` for instant multi-tab sync.
* **Sandbox Execution**: In-browser sandboxed test runner with isolated worker threads and AST static analysis.
* **Persistence Layer**: Cloud Firestore for historical telemetry archives and player rankings.

**Visual Layout**:
* Architectural block diagram displaying the clean separation between edge presence, micro-event streaming, and telemetry archives.

**Speaker Notes**:
> "For the backend, we engineered a bulletproof dual-path architecture. Firebase Realtime Database guarantees instant, quota-free lobby presence with automatic tab-close cleanup, while Cloudflare Workers and Durable Objects handle real-time WebSocket event broadcasts. If one channel hiccups, the game seamlessly carries on without interruption."

---

## Slide 5: Game Modes & Content Packs
### **Tailored Scenarios for Every Engineering Discipline**

* 🟢 **Pack 1: Task Master API (JavaScript / Node.js)**
  * *Focus*: Async queue race conditions, microtask execution ordering, priority filter mutations.
  * *Audience*: Full-Stack & Frontend Engineers.
* 🔵 **Pack 2: Inventory & Discount Engine (Python 3.11)**
  * *Focus*: Floating-point rounding inaccuracies, negative stock race conditions, tiered discount boundary checks.
  * *Audience*: Backend & Data Engineers.
* 🟣 **Pack 3: Auth & Sliding-Window Rate Limiter (TypeScript Hard)**
  * *Focus*: JWT expiration timestamp unit conversions (seconds vs ms) and sliding-window Redis counter leaks.
  * *Audience*: Systems & Security Engineers.
* ⚡ **3 Flexible Matchmaking Modes**:
  1. **Launch Arena Match**: Host custom rooms with custom timer and mafia ratios.
  2. **Join by Room PIN**: 6-character room codes for private squad sessions.
  3. **Quick Match Scanner**: Automatic global matchmaking connecting players to active open lobbies.

**Visual Layout**:
* 3 sleek mode cards featuring language badges (Node.js, Python, TypeScript) alongside live difficulty indicators and player capacities (6 to 12 players).

**Speaker Notes**:
> "Code Mafia comes out of the box with diverse curriculum content packs. Whether you're debugging asynchronous event loops in JavaScript, precision rounding in Python, or security limits in Node.js, each pack provides realistic codebase challenges with real unit test verification."

---

## Slide 6: Gamification, Analytics & Progression
### **The Developer Journey: Beyond Just Gaming**

* **Developer Journey XP Engine**:
  * Earn XP based on bugs fixed, tests passed, saboteurs identified, and successful pull requests.
  * Tiered rank milestones: *Script Kiddie → Junior Debugger → Senior Refactorer → Staff Principal Architect*.
* **Interactive Replay & Code Scrubber**:
  * Scrub through step-by-step Git history after each match.
  * Analyze exact code diffs and reveal which player made covert edits.
* **Match History & Telemetry Dashboard**:
  * Review comprehensive post-match analytics: pass rate graphs, timeline of sabotage events, and MVP awards.
* **Admin Content Pack Creator**:
  * In-app wizard to build and publish custom code challenges, test suites, and bug templates.

**Visual Layout**:
* 2-column showcase: Left shows the XP Rank progression badges and Leaderboard; Right shows the Replay Scrubber timeline and diff inspector.

**Speaker Notes**:
> "Code Mafia extends beyond individual game sessions. Our progression engine rewards engineering accuracy with persistent ranks and telemetry. After each match, players can review the replay timeline—watching the code mutate commit by commit to uncover exactly how bugs were introduced or resolved."

---

## Slide 7: Impact, Roadmap & Future Vision
### **The Future of Collaborative Developer Gaming**

* **Immediate Applications**:
  * **University / Bootcamp Training**: Interactive group learning replacing passive lectures.
  * **Corporate Team Building**: High-engagement virtual engineering game nights.
  * **Recruitment & Hiring**: Live evaluation of code reading, communication, and debugging under real constraints.
* **Roadmap Ahead**:
  * 🌐 **Expanded Language Runtimes**: Go, Rust, and Java integration via WebAssembly containers.
  * 🎙️ **Integrated Spatial Voice Chat**: Proximity-based audio during discussion and voting phases.
  * 🤖 **AI-Assisted Co-Pilot / Spectator**: AI commentator analyzing match telemetry and generating post-game debriefs.
* **Takeaways**:
  * Full-stack cloud-native deployment live today.
  * Zero-setup browser access—no local IDE or dependencies required.

**Visual Layout**:
* Summary bullet points on left, contact/links on right with QR code placeholder leading to [https://codemafia-54284.web.app](https://codemafia-54284.web.app).

**Speaker Notes**:
> "Code Mafia proves that technical collaboration and competitive social deduction are a perfect match. Thank you! We invite you to join a live match at codemafia-54284.web.app and experience collaborative debugging like never before."
