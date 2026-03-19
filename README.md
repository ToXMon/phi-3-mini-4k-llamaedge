<p align="center">
  <img src="https://img.shields.io/badge/WasmEdge-0.14.1-blue?logo=wasm&logoColor=white" alt="WasmEdge" />
  <img src="https://img.shields.io/badge/LlamaEdge-0.29.0-green?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+" alt="LlamaEdge" />
  <img src="https://img.shields.io/badge/Phi--3--mini-4k-3.8B%20params-orange" alt="Model" />
  <img src="https://img.shields.io/badge/Akash%20Network-deployed-purple?logo=akash&logoColor=white" alt="Akash" />
  <img src="https://img.shields.io/badge/GHCR-published-24292f?logo=github&logoColor=white" alt="GHCR" />
  <img src="https://img.shields.io/badge/License-MIT-brightgreen" alt="License" />
  <img src="https://img.shields.io/badge/CPU%20%2B%20GPU-variants-9cf" alt="Variants" />
</p>

<h1 align="center">LlamaEdge × Phi-3-mini-4k on Akash Network</h1>

<p align="center">
  Production-grade LLM inference via WebAssembly — deployed on decentralized cloud.<br/>
  OpenAI-compatible API · Built-in Chatbot UI · Zero vendor lock-in.
</p>

---

## What Is This?

Docker images that run [LlamaEdge](https://github.com/second-state/LlamaEdge) (WasmEdge's LLM inference server) on [Akash Network](https://akash.network) — a decentralized cloud marketplace. Phi-3-mini-4k-instruct serves chat completions and all-MiniLM-L6-v2 serves embeddings, both exposed through a standard OpenAI-compatible REST API with a built-in chatbot UI.

**Why this matters:** This project eliminates vendor lock-in at every layer — model weights (MIT GGUF), runtime (single WASM binary), API (OpenAI standard), and infrastructure (Akash marketplace). No API keys, no data leaving your control, no cloud accounts.

| Component | Version / Details |
|---|---|
| WasmEdge Runtime | 0.14.1 (pinned — see Pitfall #1) |
| wasi_nn-ggml Plugin | 0.14.1 (direct tarball — see Pitfall #3) |
| LlamaEdge Server | 0.29.0 `llama-api-server.wasm` |
| Chat Model | Phi-3-mini-4k-instruct-Q5_K_M (~2.62 GiB, 3.8B params, 69% MMLU) |
| Embedding Model | all-MiniLM-L6-v2-ggml-model-f16 (~46 MiB) |
| API | OpenAI-compatible on port 8080 |
| Bases | `ubuntu:22.04` (CPU) · `nvidia/cuda:12.2.0-runtime-ubuntu22.04` (GPU) |

---

## Quick Start

### Deploy on Akash Network (GPU)

1. Go to [Akash Console](https://console.akash.network)
2. Click **Deploy** → paste the contents of `deploy-gpu.yaml`
3. Select a GPU provider with NVIDIA A100 or similar
4. Deploy — your endpoint is live in ~2 minutes

### Deploy on Akash Network (CPU)

Same steps using `deploy-cpu.yaml`. Slower inference but works on any provider.

### Run Locally with Docker

```bash
# CPU variant
 docker run -p 8080:8080 ghcr.io/toxmon/phi-3-mini-4k-llamaedge:652d3f4

# GPU variant (requires NVIDIA Container Toolkit)
 docker run --gpus all -p 8080:8080 ghcr.io/toxmon/phi-3-mini-4k-llamaedge:cuda12-652d3f4
```

Then open `http://localhost:8080` for the chatbot UI, or hit the API:

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-3-mini-4k-instruct",
    "messages": [{"role": "user", "content": "Explain WASM in one sentence."}],
    "max_tokens": 100
  }'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Akash Network Lease                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Docker Container (:8080)                 │  │
│  │                                                       │  │
│  │  ┌─────────────┐   ┌──────────────────────────────┐  │  │
│  │  │  WasmEdge   │   │   llama-api-server.wasm      │  │  │
│  │  │  Runtime    │──▶│   (LlamaEdge 0.29.0)         │  │  │
│  │  │  0.14.1     │   │                              │  │  │
│  │  └──────┬──────┘   └──────────┬───────────────────┘  │  │
│  │         │                     │                      │  │
│  │  ┌──────▼─────────────────────▼───────────────────┐  │  │
│  │  │        wasi_nn-ggml Plugin (0.14.1)            │  │  │
│  │  │   ┌──────────────────┐ ┌────────────────────┐  │  │  │
│  │  │   │ Phi-3-mini-4k    │ │ all-MiniLM-L6-v2   │  │  │  │
│  │  │   │ Q5_K_M.gguf     │ │ embedding.gguf     │  │  │  │
│  │  │   │ (Chat: 2.62 GiB) │ │ (Embed: 46 MiB)    │  │  │  │
│  │  │   └──────────────────┘ └────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  REST API (OpenAI-compatible) + Chatbot UI     │  │  │
│  │  │  POST /v1/chat/completions                     │  │  │
│  │  │  POST /v1/embeddings                           │  │  │
│  │  │  GET  /v1/models                               │  │  │
│  │  │  GET  /  (chatbot UI)                          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                    │
    CUDA 12.2 (GPU)                    CPU only
    nvidia/cuda base                  ubuntu:22.04 base
```

---

## API Reference

All endpoints are on port **8080**. Fully OpenAI-compatible — change your `base_url` and go.

### `POST /v1/chat/completions`

Chat completions with Phi-3-mini-4k-instruct.

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-3-mini-4k-instruct",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is WebAssembly?"}
    ],
    "temperature": 0.7,
    "max_tokens": 512,
    "stream": false
  }'
```

### `POST /v1/embeddings`

Generate embeddings with all-MiniLM-L6-v2.

```bash
curl http://localhost:8080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "all-MiniLM-L6-v2",
    "input": "Hello, world!"
  }'
```

### `GET /v1/models`

List available models.

```bash
curl http://localhost:8080/v1/models
```

### `GET /`

Built-in chatbot web UI. No additional setup required.

---

## The 8 Pitfalls

> **This is the core value of this repo.** Each pitfall below cost hours to days of debugging. None are documented in WasmEdge or LlamaEdge official docs. If you're building a similar stack, read this section first.

---

### Pitfall 1: WasmEdge Version Compatibility (ABI Mismatch)

| | |
|---|---|
| **Symptom** | `free(): invalid pointer` crash with no error message pointing to version mismatch |
| **Root Cause** | LlamaEdge 0.29.0 WASM binary was compiled against WasmEdge 0.14.x SDK. WasmEdge 0.15.0 introduced breaking API changes. The crash is a memory corruption from ABI incompatibility. |
| **Fix** | Pin WasmEdge to **0.14.1**. Do not use 0.15.0 or later until LlamaEdge publishes a compatible build. |

```dockerfile
# CORRECT
ARG WASMEDGE_VERSION=0.14.1

# WRONG — will crash at runtime with 'free(): invalid pointer'
ARG WASMEDGE_VERSION=0.15.0
```

---

### Pitfall 2: Plugin .so Naming Across Versions

| | |
|---|---|
| **Symptom** | Plugin not found at runtime; `cannot open shared object file` for the expected .so name |
| **Root Cause** | Community references and older docs reference different plugin names (`libwasmedge_wasi_nn.so`, `libwasmedgePluginWasiNnGGML.so`, etc.). The **actual** name in both 0.14.1 and 0.15.0 is `libwasmedgePluginWasiNN.so` — the rename happened *before* 0.14.1, not in 0.15.0 as some sources claim. |
| **Fix** | Always verify by inspecting the tarball contents before assuming a name. Add a build-time guard: |

```dockerfile
RUN test -f /opt/wasmedge/plugin/libwasmedgePluginWasiNN.so || \
    { echo 'FATAL: plugin .so not found — check tarball contents'; exit 1; }
```

---

### Pitfall 3: Installer Script Silent Failures

| | |
|---|---|
| **Symptom** | Plugin directory is empty after running the install script. No error output. |
| **Root Cause** | The `curl ... | bash` installer from WasmEdge's docs silently fails to download plugins for versions below 0.15.0 — no pre-built plugin assets exist in GitHub releases for those versions. The script doesn't error; it just skips the plugin. |
| **Fix** | Bypass the installer entirely. Use direct tarball downloads from GitHub releases: |

```dockerfile
# WRONG — silently fails for 0.14.x
RUN curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh | bash -s -- -v 0.14.1 --plugin wasi_nn-ggml

# CORRECT — direct tarball download
RUN curl -sL "https://github.com/WasmEdge/WasmEdge/releases/download/0.14.1/WasmEdge-plugin-wasi_nn-ggml-0.14.1-manylinux_2_28_x86_64.tar.gz" \
    | tar xz
```

---

### Pitfall 4: Unpredictable Tarball Internal Structures

| | |
|---|---|
| **Symptom** | `tar: can't change to 'WasmEdge-0.14.1-Linux/bin': No such file or directory` or similar path errors |
| **Root Cause** | WasmEdge release tarballs do not have stable internal directory layouts across versions. A `--strip-components=1` that works for 0.13.x may break for 0.14.x because the nesting depth changed. |
| **Fix** | Use find-based extraction that locates files by name regardless of directory structure: |

```dockerfile
# WRONG — breaks when tarball structure changes
RUN mkdir -p /opt/wasmedge/bin && \
    tar xzf WasmEdge-0.14.1-manylinux_2_28_x86_64.tar.gz \
      -C /opt/wasmedge/bin --strip-components=2

# CORRECT — finds files by name, structure-agnostic
RUN tmpdir=$(mktemp -d) && \
    tar xzf WasmEdge-0.14.1-manylinux_2_28_x86_64.tar.gz -C "$tmpdir" && \
    find "$tmpdir" -type f -name "wasmedge" -exec cp {} /opt/wasmedge/bin/ \; && \
    rm -rf "$tmpdir"
```

---

### Pitfall 5: Symlink Preservation for .so Chains

| | |
|---|---|
| **Symptom** | `libwasmedge.so.0: cannot open shared object file: No such file or directory` at runtime despite the file existing in the build stage |
| **Root Cause** | WasmEdge uses a symlink chain: `libwasmedge.so` → `libwasmedge.so.0` → `libwasmedge.so.0.0.0`. A naive `find -type f` skips symlinks entirely, so only the concrete `.so.0.0.0` file gets copied. At runtime, anything looking for `libwasmedge.so.0` fails. |
| **Fix** | Use `cp -a` (archive mode preserves symlinks) with a find that matches both files and symlinks: |

```dockerfile
# WRONG — skips symlinks, breaks .so chain
RUN find "$tmpdir" -type f -name 'libwasmedge*.so*' \
    -exec cp {} /opt/wasmedge/lib/ \;

# CORRECT — preserves symlink chain
RUN find "$tmpdir" \( -type f -o -type l \) -name 'libwasmedge*.so*' \
    -exec cp -a {} /opt/wasmedge/lib/ \;
```

---

### Pitfall 6: Docker Exec-Form Ignores PATH

| | |
|---|---|
| **Symptom** | `wasmedge: not found` at container startup, despite `ENV PATH="/opt/wasmedge/bin:$PATH"` being set in the Dockerfile |
| **Root Cause** | Docker's exec-form `ENTRYPOINT` (JSON array syntax) does **not** run through a shell. It inherits a minimal environment from the container runtime — `PATH` is set to the system default, ignoring any `ENV` directives. |
| **Fix** | Use the absolute path to the wasmedge binary: |

```dockerfile
# WRONG — exec form ignores PATH
ENV PATH="/opt/wasmedge/bin:${PATH}"
ENTRYPOINT ["wasmedge", "--dir", ".", "llama-api-server.wasm", ...]

# CORRECT — absolute path
ENTRYPOINT ["/opt/wasmedge/bin/wasmedge", "--dir", ".", "llama-api-server.wasm", ...]
```

> **Note:** The `ENV` directives for `LD_LIBRARY_PATH` and `WASMEDGE_PLUGIN_PATH` still work correctly because the dynamic linker reads them. Only `PATH` is affected because it's used by the shell to resolve executables — and there is no shell in exec form.

---

### Pitfall 7: HuggingFace Auth-Gated Repos Return Silent Garbage

| | |
|---|---|
| **Symptom** | `invalid magic characters: 'Inva'` at runtime when loading the embedding model |
| **Root Cause** | The HuggingFace repo `gaunernst/all-MiniLM-L6-v2` is **auth-gated**. `curl -sL` without authentication receives a 29-byte HTML error page containing `Invalid username or password` — but curl exits with code 0 (success). The error page is saved with the correct filename, so the build appears to succeed. At runtime, the GGML parser reads `Inva...` instead of `GGUF` magic bytes. |
| **Secondary failure** | Using a truncated URL to the correct repo (e.g., omitting the full filename) returns a different HTML error page with magic bytes `Entr` (from `<HTML>...`). |
| **Fix** | Use the official second-state repo with the **exact** filename: |

```dockerfile
# WRONG — auth-gated, returns 29-byte error page silently
RUN curl -sL "https://huggingface.co/gaunernst/all-MiniLM-L6-v2/resolve/main/ggml-model-f16.gguf" \
    -o all-MiniLM-L6-v2-ggml-model-f16.gguf

# WRONG — correct repo but truncated filename, returns HTML error page
RUN curl -sL "https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/ggml-model-f16.gguf" \
    -o all-MiniLM-L6-v2-ggml-model-f16.gguf

# CORRECT — official repo, exact filename, verified 45,949,216 bytes
RUN curl -sL "https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-ggml-model-f16.gguf" \
    -o all-MiniLM-L6-v2-ggml-model-f16.gguf
```

**Defensive check** — verify the download is actually a GGUF file:

```dockerfile
RUN file all-MiniLM-L6-v2-ggml-model-f16.gguf | grep -q GGUF || \
    { echo "FATAL: embedding model is not a valid GGUF file"; exit 1; }
```

---

### Pitfall 8: `--web-ui` Uses Guest Path, Not Host Path

| | |
|---|---|
| **Symptom** | Chatbot UI is not served; visiting port 8080 shows the API but no web interface. No error logged. |
| **Root Cause** | LlamaEdge's `--web-ui` flag specifies the path **inside the Wasm guest environment**, not the host filesystem path. When using `--dir /app/chatbot-ui`, the guest sees this directory mounted as `chatbot-ui`. Passing `/app/chatbot-ui` to `--web-ui` fails silently because that path doesn't exist in the guest. |
| **Fix** | Use the guest-relative path that corresponds to the `--dir` mount point: |

```dockerfile
# WRONG — host path, not visible inside WASM guest
ENTRYPOINT ["/opt/wasmedge/bin/wasmedge", "--dir", "/app/chatbot-ui", \
    "llama-api-server.wasm", \
    "--web-ui", "/app/chatbot-ui", ...]

# CORRECT — guest-relative path matching the --dir mount
ENTRYPOINT ["/opt/wasmedge/bin/wasmedge", "--dir", "/app/chatbot-ui", \
    "llama-api-server.wasm", \
    "--web-ui", "chatbot-ui", ...]
```

> **General rule:** Any LlamaEdge flag that references files must use paths relative to the WASM guest's virtual filesystem root, which is defined by `--dir` mounts.

---

## Building from Source

### Prerequisites

- Docker with BuildKit
- (GPU variant) NVIDIA Container Toolkit

### Build CPU Variant

```bash
docker build -t phi-3-mini-4k-llamaedge:cpu \
  -f Dockerfile .
```

### Build GPU Variant

```bash
docker build -t phi-3-mini-4k-llamaedge:gpu \
  -f Dockerfile.cuda12 .
```

### Image Tags

| Tag | Base Image | Description |
|---|---|---|
| `652d3f4` | `ubuntu:22.04` | CPU-only inference |
| `cuda12-652d3f4` | `nvidia/cuda:12.2.0-runtime-ubuntu22.04` | NVIDIA GPU inference (CUDA 12.2) |

### CI/CD

Images are built automatically via [GitHub Actions](.github/workflows/docker-build.yml) on push to `main` and pushed to GHCR:

```
ghcr.io/toxmon/phi-3-mini-4k-llamaedge:652d3f4
ghcr.io/toxmon/phi-3-mini-4k-llamaedge:cuda12-652d3f4
```

---

## Community Value

### Value to Akash Network

This project proves that **Akash can run production-grade GPU LLM inference** — not just web apps, API proxies, and blockchain nodes. Specifically:

- **Copy-paste deployment** — the SDL files (`deploy-cpu.yaml`, `deploy-gpu.yaml`) let anyone spin up a private LLM endpoint in minutes, no DevOps experience needed
- **Cost advantage** — Akash GPU pricing undercuts traditional cloud by 60–90%:
  - Akash A100: ~$0.14/hr (~$100/mo) vs AWS H100: ~$3.90/hr (~$2,839/mo)
  - Akash A100: ~$1.46/hr for H100-class vs AWS: ~$3.90/hr
- **Break-even analysis** — At gpt-4o-mini pricing (~$0.15/1M input, $0.60/1M output), self-hosting on Akash breaks even at ~4.5M tokens/month. At 10M tokens/month, you save ~$6,500/year
- **Drop-in replacement** — OpenAI API compatibility means existing applications switch by changing one `base_url` environment variable
- **Demonstrates decentralized inference** — open model + open runtime + decentralized infrastructure + standard API. This is a genuinely new deployment model

### Value to WasmEdge / Second-State

- **Documents 8 previously undocumented pitfalls** that each cost hours-to-days to debug. This alone could save the community hundreds of cumulative hours
- **Reference Dockerfile for containerized deployment** — official WasmEdge docs work well for terminal installs but have gaps for containerized, multi-variant (CPU/GPU) builds
- **GPU deployment demystified** — covers the separate CUDA plugin tarball, version compatibility between runtime and plugin, and library dependency chain
- **Validates the WASM + GGML approach**: portable (single binary, no recompilation per architecture), sandboxed (memory isolation via WASM), zero Python dependency (no venv, no pip, no version conflicts), fast startup (milliseconds, not the 10–30s Python cold starts)

### Broader Significance

This stack eliminates vendor lock-in at **every layer**:

| Layer | Locked Approach | This Project |
|---|---|---|
| Model | Proprietary weights, API-only access | MIT-licensed GGUF, fully self-hosted |
| Runtime | Python + CUDA + version matrix | Single WASM binary, no recompilation |
| API | Proprietary protocols | OpenAI-compatible standard |
| Infrastructure | Cloud accounts, contracts, billing | Akash marketplace, pay-per-lease, no account |

**Privacy properties:** No data leaves your control. No API keys to leak. Infrastructure is transient (Akash leases are ephemeral — when the lease ends, the VM is destroyed). You choose the provider's jurisdiction.

**"Write once, run anywhere" for AI inference on decentralized cloud** — this is a genuinely new deployment model that wasn't practical before the convergence of WASM runtimes, GGUF model format, and decentralized compute marketplaces.

---

## Cost Analysis

### Self-Hosted (Akash) vs. OpenAI API

| Metric | Akash Self-Hosted (A100) | OpenAI gpt-4o-mini |
|---|---|---|
| Monthly infra cost | ~$100/mo | $0 (pay per token) |
| Input price | $0 | $0.15 / 1M tokens |
| Output price | $0 | $0.60 / 1M tokens |
| Break-even volume | — | ~4.5M tokens/month |
| 10M tokens/month cost | ~$100 | ~$3,750/mo |
| 10M tokens/month savings | — | **~$6,500/year** |
| 50M tokens/month cost | ~$100 | ~$18,750/mo |
| 50M tokens/month savings | — | **~$223,800/year** |
| Privacy | Full (data stays on-lease) | Data sent to OpenAI |
| Latency | Network to Akash provider | Network to OpenAI |
| Model flexibility | Swap any GGUF model | Fixed to OpenAI's offering |
| Vendor lock-in | None (MIT weights + WASM) | Full (proprietary API) |

> **Note:** Akash pricing varies by provider and market conditions. A100 at $0.14/hr is typical but not guaranteed. GPU variants (A100 40GB vs 80GB) also affect pricing. The SDL files can be edited to target different hardware tiers.

### Akash vs. Traditional Cloud GPU

| Provider | GPU | Hourly Rate | Monthly (730h) |
|---|---|---|---|
| Akash (typical) | A100 80GB | ~$0.14 | ~$100 |
| Akash (typical) | H100 80GB | ~$1.46 | ~$1,066 |
| AWS | H100 80GB | ~$3.90 | ~$2,839 |
| GCP | H100 80GB | ~$2.95 | ~$2,154 |
| Lambda Labs | H100 80GB | ~$1.99 | ~$1,453 |

---

## License & Credits

- **Model weights:** Phi-3-mini-4k-instruct — [MIT License](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct) (Microsoft)
- **Embedding model:** all-MiniLM-L6-v2 — [Apache 2.0](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) via [second-state GGUF conversion](https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF)
- **Runtime:** [WasmEdge](https://github.com/WasmEdge/WasmEdge) — [Apache 2.0](https://github.com/WasmEdge/WasmEdge/blob/main/LICENSE)
- **Inference server:** [LlamaEdge](https://github.com/second-state/LlamaEdge) — [Apache 2.0](https://github.com/second-state/LlamaEdge/blob/main/LICENSE)
- **Infrastructure:** [Akash Network](https://akash.network) — [Apache 2.0](https://github.com/ovrclk/akash)
- **Docker images & SDL files:** [MIT](LICENSE)

---

<p align="center">
  <strong>Repository:</strong> <a href="https://github.com/ToXMon/phi-3-mini-4k-llamaedge">ToXMon/phi-3-mini-4k-llamaedge</a> ·
  <strong>Container Registry:</strong> <a href="https://github.com/ToXMon/phi-3-mini-4k-llamaedge/pkgs/container/phi-3-mini-4k-llamaedge">ghcr.io/toxmon/phi-3-mini-4k-llamaedge</a>
</p>
