# Migration Notes: LlamaEdge Server App → Offline-First WebLLM PWA (Phase 1)

## Scope of this phase

This document is planning-only (audit + migration plan).  
No broad implementation is performed in this phase.

## Repo audit summary

Current repository contents:

- `Dockerfile`, `Dockerfile.cuda12`: server-side LlamaEdge container builds
- `deploy-cpu.yaml`, `deploy-gpu.yaml`: Akash SDL manifests for containerized API service
- `.github/workflows/docker-build.yml`: CI for Docker image build/push
- `README.md`, `X-THREAD.md`: server deployment docs and operational pitfalls

No existing frontend source tree (`src/`), package manager manifest, or JS/TS test tooling is currently present.

## Preserve / retire / repurpose

### Preserve

- `README.md` (as historical context and to be rewritten for new product)
- `X-THREAD.md` (historical incident context)
- `.github/workflows/docker-build.yml` concepts (CI pattern only; file will later be replaced)

### Retire (in later implementation phases)

- `Dockerfile`, `Dockerfile.cuda12` (server inference runtime artifacts)
- `deploy-cpu.yaml`, `deploy-gpu.yaml` (API deployment manifests)

### Repurpose

- Akash deployment intent: continue using Akash, but to host static PWA shell/assets.
- Existing project identity/branding references where suitable.

## WebLLM compatibility gap (critical)

Current model sourcing uses:

- `Phi-3-mini-4k-instruct-Q5_K_M.gguf`
- `all-MiniLM-L6-v2-ggml-model-f16.gguf`

These are LlamaEdge/ggml-oriented assets referenced by container entrypoints.  
For browser-local inference via WebLLM, we must define:

1. MLC/WebLLM-compatible model record/config
2. Artifact source path suitable for browser download/caching
3. Runtime wasm/worker/library assets required by WebLLM

### Phase-1 conclusion on compatibility

- **Do not assume current GGUF URLs can be used as-is in WebLLM.**
- A model artifact strategy document and validation matrix are required before Phase 2 implementation.

## Proposed file tree (implementation target)

```text
/
├── docs/
│   ├── architecture.md
│   ├── migration-from-llamaedge.md
│   └── todo.md
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── offline.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   ├── features/
│   │   ├── chat/
│   │   └── models/
│   ├── lib/
│   │   ├── webllm/
│   │   ├── storage/
│   │   └── capabilities/
│   └── styles/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── Dockerfile              # static serving image for built assets (new)
├── deploy.yaml             # Akash SDL for static app hosting (new)
└── README.md               # rewritten for PWA flow
```

## Identified technical risks

1. **Model artifact incompatibility risk (high)**  
   Existing GGUF packaging may not satisfy WebLLM runtime expectations.

2. **Browser capability fragmentation (high)**  
   WebGPU support differs across browsers/devices; unsupported path must remain graceful.

3. **Large model download/storage UX risk (high)**  
   Mobile users may face constrained storage, network interruptions, and long first-run waits.

4. **Offline correctness risk (high)**  
   App shell offline != full inference offline unless worker/runtime/model artifacts are all cached and recoverable.

5. **Service worker cache invalidation risk (medium)**  
   Incorrect cache versioning can strand users with stale or partial artifacts.

6. **Perceived latency risk (medium)**  
   Browser-local inference may feel slow on weaker devices; UX must expose clear state and controls.

## Recommended implementation order

1. **Scaffold base app**
   - React + TypeScript + Vite baseline
   - Establish folder boundaries (`components`, `features`, `lib`, `styles`)

2. **Capability + state foundation**
   - Browser/WebGPU/storage capability detection
   - Top-level app state machine (`first-load`, `downloading`, `ready`, `offline-ready`, `unsupported`, `recovery`)

3. **PWA foundation**
   - Manifest + service worker + cache versioning
   - Offline shell validation

4. **WebLLM integration spike**
   - Worker-based init/generation lifecycle
   - Streaming tokens + cancel path
   - Verify Phi-3 default model compatibility path

5. **Model manager**
   - Available models registry (default Phi-3 Mini 4K)
   - Download progress/size/cached state
   - Delete/re-download flows

6. **Chat UX + persistence**
   - Message UX + regenerate/clear/stop
   - Browser-local conversation persistence

7. **Settings + recovery surfaces**
   - Temperature/max tokens/model selector/context reset
   - Corrupted cache detection and recovery

8. **Akash static deploy assets + docs**
   - Static-serving Dockerfile + Akash SDL
   - README and operational docs update

9. **Focused tests**
   - capability helpers
   - storage/model metadata logic
   - reducer/state transitions

