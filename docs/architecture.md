# Architecture

This project now ships as an **offline-first browser app** with optional static hosting on Akash.
Inference runs in the user’s browser (WebLLM + WebGPU), not on a remote model server.

## High-level system

1. **Static delivery layer**
   - The `app/` frontend is built with Vite and deployed as static files.
   - `Dockerfile.pwa` + `nginx.pwa.conf` serve the built app shell.
   - `deploy-pwa.yaml` deploys the static image on Akash.

2. **Client runtime layer**
   - React + TypeScript UI in `app/src/`.
   - Routing and shell layout handle chat and settings views.
   - Browser capability checks gate unsupported environments.

3. **Inference layer**
   - WebLLM runs in a dedicated web worker (`app/src/features/chat/webllm.worker.ts`).
   - `ChatManagerProvider` coordinates initialization, streaming generation, retries, and cancellation.
   - The default model ID is managed through `app/src/features/models/modelRegistry.ts`.

4. **Offline/storage layer**
   - PWA service worker caches app shell assets for offline loading.
   - WebLLM manages model artifacts in browser storage.
   - Chat history is stored locally (browser-only) and never sent to a backend.
   - Quota checks warn when device storage pressure can affect downloads/caching.

## Request and data flow

1. User opens the app (online or offline).
2. App checks required browser capabilities.
3. On first prompt, chat manager initializes WebLLM in worker:
   - if online: download/caches model artifacts as needed
   - if offline: requires an already-cached model
4. Tokens stream back from worker to UI.
5. Conversation state is persisted locally in browser storage.

## Deployment model

- **Recommended release target:** PWA static image (`Dockerfile.pwa`) on Akash (`deploy-pwa.yaml`).
- **Legacy server artifacts** (`Dockerfile`, `Dockerfile.cuda12`, `deploy-cpu.yaml`, `deploy-gpu.yaml`) remain in the repo for historical/server workflows, but the product UX is centered on browser-local inference.

## Operational characteristics

- No required inference backend in the core path.
- No model prompts/responses leave the device by default.
- First-run experience depends on model download speed and available storage.
- User experience includes explicit states for loading, empty chat, offline readiness, and local error recovery.
