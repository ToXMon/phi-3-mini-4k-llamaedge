# Phi-3 Mini local PWA app

## Offline lifecycle

1. **First online visit (bootstrap)**
   - The PWA service worker is registered and caches the app shell assets.
   - The app can then reload from cache even if the network drops later.

2. **Model download / warmup**
   - The first inference triggers WebLLM initialization and model artifact download.
   - Artifacts are cached in browser-managed storage (IndexedDB/Cache via WebLLM).
   - Once downloaded, the model is available for offline inference.

3. **Offline usage**
   - App shell still loads from service worker cache.
   - If model artifacts are already cached, inference continues fully offline.
   - If artifacts are missing, the UI explains that one online download is required.

4. **Corruption recovery**
   - If model cache corruption is detected during initialization (cache/IndexedDB errors),
     the app clears corrupted model artifacts and prompts a clean re-download.
   - Model metadata is also sanitized on load to recover from invalid local storage state.

5. **Storage and quota messaging**
   - Settings displays browser storage usage/quota estimates when available.
   - A warning appears when usage is very high to explain likely download/cache failures.

6. **Unsupported browser handling**
   - On startup, required capabilities are checked (WebGPU, workers, service worker, IndexedDB, storage estimate API).
   - If missing, the app shows a dedicated unsupported-browser page listing missing features.
