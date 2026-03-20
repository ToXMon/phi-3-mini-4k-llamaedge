# Migration from LlamaEdge Server Deployments

This guide summarizes how to move from the legacy server-centric setup to the current browser-local PWA product.

## What changed

### Before (legacy)
- Runtime and inference hosted in containerized LlamaEdge services.
- Primary deployment targets were `deploy-cpu.yaml` and `deploy-gpu.yaml`.
- Docker images bundled runtime/plugin/model-server concerns.

### Now (current)
- Inference runs in-browser with WebLLM and WebGPU.
- Primary deployment target is static PWA hosting via `Dockerfile.pwa` + `deploy-pwa.yaml`.
- Product behavior focuses on local storage, offline readiness, and browser capability gating.

## Migration checklist

1. **Update deployment target**
   - Prefer `deploy-pwa.yaml` for Akash.
   - Build and publish the PWA image from `Dockerfile.pwa`.

2. **Adopt frontend build flow**
   - From `app/`: `npm ci --legacy-peer-deps`
   - Validate with:
     - `npm run lint`
     - `npm run build`

3. **Reframe operations**
   - Treat model download and caching as client-side lifecycle concerns.
   - Monitor user-facing states (loading/offline/error) rather than server pod logs for inference behavior.

4. **Set user expectations**
   - The first run requires model download.
   - Offline inference works after successful model caching.
   - Browser/device capability directly affects support and performance.

## Compatibility notes

- Existing server-side GGUF and plugin/container assumptions do not automatically map to WebLLM runtime expectations.
- Keep browser-local model compatibility under the model registry flow in `app/src/features/models`.

## Recommended rollout pattern

1. Publish and smoke test the PWA image.
2. Verify first-run download UX and offline replay on representative browsers.
3. Keep legacy server manifests available as fallback during transition windows.
4. Decommission server-first docs and runbooks once PWA release is validated in production.
