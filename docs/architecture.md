# Architecture Notes (Phase 1: Audit + Migration Planning)

## Current architecture (as-is)

This repository is currently a **server-side LlamaEdge deployment**:

- `Dockerfile` / `Dockerfile.cuda12` build container images that run:
  - WasmEdge runtime
  - `llama-api-server.wasm`
  - GGUF model files
  - prebuilt `chatbot-ui`
- `deploy-cpu.yaml` and `deploy-gpu.yaml` are Akash SDL manifests for deploying that container.
- `.github/workflows/docker-build.yml` builds and pushes CPU/GPU Docker images to GHCR.

Inference is done on the server container, not in the browser.

## Target architecture (to-be)

The repo will pivot to a **static, offline-first PWA** served on Akash:

- App shell: React + TypeScript + Vite
- Inference: WebLLM in-browser (WebGPU first, WASM fallback where possible)
- Caching: service worker + browser storage for app/runtime/model artifacts
- UX: local chat history persistence, offline-ready state, model download management
- No mandatory remote inference in the core flow

## Core architectural constraints

1. **Model compatibility constraint**
   - Existing artifacts are GGUF for LlamaEdge/ggml.
   - WebLLM requires MLC-compatible model artifacts and runtime libs.
   - Therefore, existing GGUF artifact references in Dockerfiles should not be assumed directly compatible.

2. **Offline guarantee constraint**
   - After install + model download, app must function with network disabled.
   - This requires complete asset/runtime/model caching strategy and explicit recovery handling.

3. **Device capability constraint**
   - Browser support for WebGPU varies by browser/device.
   - Capability detection + unsupported-browser UX must be a first-class path.

## CI observation relevant to migration

Recent historical Docker workflow failures in `Build and Push LlamaEdge Phi-3 Images` were caused by plugin filename expectation mismatch in prior revisions (`libwasmedgePluginWasiNnGgml.so` not found in job logs). This supports migration away from server runtime/plugin coupling toward browser-local inference.

