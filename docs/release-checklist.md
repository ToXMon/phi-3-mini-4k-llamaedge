# Release Checklist

- [ ] Confirm `app/` dependencies install cleanly with `npm ci --legacy-peer-deps`
- [ ] Run `npm run lint` in `app/`
- [ ] Run `npm run build` in `app/`
- [ ] Verify first-run chat flow (empty → loading/downloading → ready)
- [ ] Verify error handling flow (initialization/generation error messaging)
- [ ] Verify offline banner and offline inference behavior with cached model
- [ ] Verify unsupported browser page lists missing capabilities
- [ ] Capture/update screenshots in README screenshot placeholders
- [ ] Publish PWA image from `Dockerfile.pwa` to GHCR
- [ ] Deploy `deploy-pwa.yaml` and validate endpoint
- [ ] Smoke test chat and settings pages on deployed environment
- [ ] Confirm docs are up to date:
  - [ ] `docs/architecture.md`
  - [ ] `docs/migration-from-llamaedge.md`
  - [ ] `README.md`
