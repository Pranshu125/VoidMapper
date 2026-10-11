# VOID MAPPER

**Generative 3D WebGL Telemetry Visualizer // Initiative: Vibecoder**

Void Mapper ingests any public GitHub repository URL or `owner/repo` identifier, harvests repository metadata via the GitHub REST API v3, and procedurally synthesizes an interactive 3D WebGL artifact (**"The Aura"**) inside a stark, monochromatic digital museum (`#050505`).

---

## Data-to-Aura Mapping Engine

| GitHub Data Metric | JSON Endpoint / Key | Three.js Property Impact |
| :--- | :--- | :--- |
| **Total Commits** | `/repos/{owner}/{repo}/commits` (`Link` pagination + count) | Dictates `IcosahedronGeometry` vertex density and subdivision complexity (`D1`–`D14`), logarithmically clamped to protect the WebGL context against 10,000+ commit outliers. |
| **Top Languages** | `/repos/{owner}/{repo}/languages` (Bytes) | Determines base `MeshStandardMaterial` grayscale luminance, metallic sheen, and roughness—mapping language dominance to stark whites, brushed silvers, or obsidian grays. |
| **Open Issues** | `/repos/{owner}/{repo}` (`open_issues_count`) | Injects real-time normal-vector vertex displacement, harmonic turbulence, and spiked glitch offsets. |
| **Repository Age** | `/repos/{owner}/{repo}` (`created_at` vs. Now) | Modulates rotational velocity and ambient pulse rate in `useFrame`. Older repositories rotate slowly as stable monoliths; newer repositories spin rapidly. |

---

## Architecture & Stack

- **Vite + React 18**: Fast HMR development environment and declarative state management.
- **Three.js + React Three Fiber (`@react-three/fiber`) + `@react-three/drei`**: Procedural `IcosahedronGeometry` vertex manipulation, orbital controls, and zero-gravity levitation.
- **Post-Processing (`@react-three/postprocessing`)**: `EffectComposer` pipeline featuring `Bloom` (luminance threshold + mipmap blur) and `Noise` grain passes.
- **Tailwind CSS**: Strict dark/monochrome theme (`#050505` void background, crisp white typography, metallic grays) with a toggleable `HUD [ON/OFF]` museum mode.
- **Session Storage Cache**: Debounced GitHub REST API v3 harvester (`src/services/githubHarvester.js`) with `sessionStorage` persistence to prevent unauthenticated rate-limiting (60 requests/hour).

---

## Local Development

```bash
npm install
npm run dev
```
