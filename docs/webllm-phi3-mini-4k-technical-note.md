# Technical Note: Phi-3 Mini 4K Artifacts for WebLLM

## 1) Compatibility verdict on current repo assets

Current repository model assets are **not directly usable** in WebLLM.

Why:

- `Dockerfile` and `Dockerfile.cuda12` currently pull:
  - `Phi-3-mini-4k-instruct-Q5_K_M.gguf`
  - `all-MiniLM-L6-v2-ggml-model-f16.gguf`
- Those are GGUF/ggml artifacts used by LlamaEdge + WasmEdge plugin loading (`--nn-preload ... :GGML:`).
- WebLLM does **not** consume raw GGUF in `appConfig.model_list`; it expects an MLC/WebLLM model record:
  - `model` URL -> MLC-packaged model artifact directory
  - `model_lib` URL -> matching WebLLM-compatible WASM library

Bottom line: keep current GGUF assets for legacy server mode only; do not wire them into WebLLM config.

## 2) Required MLC/WebLLM artifact format

For WebLLM, each model entry must follow WebLLM `ModelRecord` shape:

```ts
{
  model: string;      // MLC model artifact base URL
  model_id: string;   // model identifier used by app
  model_lib: string;  // compiled wasm library compatible with the same model
  overrides?: {
    context_window_size?: number;
  };
  vram_required_MB?: number;
  low_resource_required?: boolean;
}
```

Artifact requirements for a valid `model` URL:

1. It must point to an **MLC-packaged model artifact directory**, not a GGUF file.
2. That artifact directory must include `mlc-chat-config.json` and the tokenizer/weight artifacts referenced by that config.
3. `model_lib` must point to the matching WebGPU WASM library compiled for the same model/quantization family.
4. `model` and `model_lib` must be version-compatible with the WebLLM package version used in the app.

## 3) Hosting strategy comparison (v1 decision)

### Option 1 — Hugging Face (recommended default)

**Use for v1**:

- `model` hosted at Hugging Face model repo
- `model_lib` hosted at pinned immutable URL

Pros:

- Aligns with how WebLLM prebuilt models are published.
- Supports large-file delivery and resumable download behavior well.
- Easiest path to get a known-good Phi-3 Mini 4K artifact online quickly.

Cons:

- External dependency on HF availability/rate limits.

### Option 2 — Repo-hosted release assets

Pros:

- Full control under this project.
- Tight coupling to tagged releases.

Cons:

- Poor fit for large model artifacts (size, download performance, release ops overhead).
- More manual lifecycle management for model and wasm updates.

### Option 3 — CDN-backed path

Pros:

- Best global latency and cache-control control.
- Suitable once traffic and regional performance requirements are clear.

Cons:

- Additional infra and cache-invalidation complexity.
- Needs robust artifact publishing/versioning pipeline.

### Recommended strategy

For **v1**, choose **Option 1 (Hugging Face model artifacts + pinned model_lib URL)**.
Add Option 3 later as an optimization layer after usage data justifies it.

## 4) Exact model configuration object for `appConfig.model_list`

Use this as the default Phi-3 Mini 4K WebLLM entry:

```ts
export const appConfig = {
  useIndexedDBCache: false,
  model_list: [
    {
      model: "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC",
      model_id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
      model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Phi-3-mini-4k-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      vram_required_MB: 3672.07,
      low_resource_required: false,
      overrides: {
        context_window_size: 4096,
      },
    },
  ],
} as const;
```

Notes:

- Values above are aligned with WebLLM prebuilt Phi-3 Mini 4K model metadata.
- Keep `model_id` exact; that string is what the engine reload call uses.

## 5) Recommended default Phi-3 Mini 4K artifact path for v1

Default `model` path for v1:

- `https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC`

Paired default `model_lib` path:

- `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Phi-3-mini-4k-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm`

This is the cleanest low-friction route to a working Phi-3 Mini 4K WebLLM setup.

## 6) Implementation plan (minimal, concrete)

- [ ] Add a new `appConfig` module containing the exact `model_list` object above.
- [ ] Wire model selection to `model_id = "Phi-3-mini-4k-instruct-q4f16_1-MLC"` for default load.
- [ ] Add startup validation: fail fast if `CreateMLCEngine` cannot resolve model/model_lib.
- [ ] Add user-visible download/init progress callback for first-load model fetch.
- [ ] Record artifact URL/version pinning policy in docs (`model` + `model_lib` pair must be updated together).
- [ ] Add one smoke test path in app startup flow: initialize engine with default model and confirm first response token stream.
