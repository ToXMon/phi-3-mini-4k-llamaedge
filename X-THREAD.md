# I Deployed a Full LLM on Decentralized Compute From My Phone

I deployed a full LLM on decentralized compute for $0.02/hr — without touching AWS.

From my phone.

No laptop. No cloud console. No DevOps team. Just an AI agent, a Dockerfile it wrote itself, and a GPU marketplace nobody told you actually works.

Here’s the full breakdown.

---

## The Stack

Here’s what’s actually running:

- **WasmEdge 0.14.1** — lightweight WASM runtime
- **LlamaEdge 0.29.0** — OpenAI-compatible API server (pure WASM, no Python)
- **Phi-3-mini-4k-instruct** — 3.8B params, 69% MMLU, Q5_K_M quantized
- **all-MiniLM-L6-v2** — embedding model for RAG
- **Akash Network** — decentralized GPU marketplace

All of it in a single Docker container. Pushed to GHCR. One SDL file to deploy.

---

## The Agent

The twist: I didn’t write any of it.

Agent Zero did. 16K+ stars on GitHub. Built by one guy, Jan Tomasek. It’s a hierarchical AI agent framework — you give it a goal, it spawns sub-agents (coder, researcher, hacker), each with their own Linux shell and context window. They execute in parallel, debug their own errors, iterate.

I talked to it on my phone. It did the rest.

The process:
1. Open Agent Zero web UI on phone (Termux → localhost)
2. Type: "Deploy LlamaEdge with Phi-3-mini on Akash Network"
3. Agent spawns a coder subordinate → writes Dockerfile
4. Agent spawns a researcher → finds correct WasmEdge version
5. Agent spawns a hacker → tests the build, finds breaking changes
6. Agent pushes image to GHCR
7. Agent generates SDL file
8. You paste SDL into Akash Console. Done.

~2 minutes to a live LLM endpoint.

---

## The Pitfalls

But it wasn’t clean. The agent hit walls. Nasty ones.

**WasmEdge 0.15.0 has a silent ABI break.** LlamaEdge 0.29.0 was compiled against WasmEdge 0.14.x. Install 0.15.0 and you get:

`free(): invalid pointer`

No error message pointing to version mismatch. Just a memory corruption crash. The agent had to bisect versions to find it. Fix: pin to 0.14.1. Don’t trust `latest`.

**The official installer script silently fails.**

`curl ... | bash -s -- -v 0.14.1 --plugin wasi_nn-ggml`

Runs clean. Exit code 0. Plugin directory is empty. No error. No warning. Just nothing. Reason: no pre-built plugin assets exist in GitHub releases for 0.14.x. The script doesn’t check.

**Symlink chains get destroyed.** Even when you download plugins manually, a naive `find -type f` skips symlinks. WasmEdge’s .so chain is `libwasmedge.so` → `libwasmedge.so.0` → `libwasmedge.so.0.0.0`. Skip the symlinks and you get:

`libwasmedge.so.0: cannot open shared object file`

**HuggingFace returns HTML error pages AS model files.** Auth-gated repos don’t 404. They silently serve a 29-byte HTML page. Your "model download" succeeds. Your model is actually `<html><body>error</body></html>`. Even on the right repo, a slightly truncated filename returns the same silent garbage. `ggml-model-f16.gguf` ≠ `all-MiniLM-L6-v2-ggml-model-f16.gguf`. No curl error. No checksum failure. Just a corrupted model that fails at runtime with an unrelated error.

The full list of undocumented pitfalls the agent discovered:

1. WasmEdge 0.15.0 ABI break → `free(): invalid pointer`
2. Plugin .so naming mismatch across docs/versions
3. Installer script silent failure (empty plugin dir, exit 0)
4. Tarball internal structure changes between versions
5. Symlink chain loss from `find -type f` (breaks .so loading)
6. Docker exec-form ENTRYPOINT ignores ENV PATH
7. HuggingFace auth-gated repos return HTML as .gguf
8. LlamaEdge `--web-ui` uses guest path, not host path

Eight pitfalls. Zero documented anywhere. One agent found them all.

---

## The Math

Let’s talk money.

Akash A100 80GB: ~$0.14/hr (~$100/mo)
AWS A100 equivalent: ~$2-3/hr (~$1,500-2,200/mo)

That’s 85-95% savings.

But the real comparison isn’t Akash vs AWS. It’s Akash vs API.

Self-hosted Phi-3 on Akash: ~$100/mo flat.
OpenAI gpt-4o-mini at 10M tokens/month: ~$3,750/mo.

Annual savings: ~$6,500. Break-even vs gpt-4o-mini: ~4.5M tokens/month.

At 50M tokens/month? You save $223K/year.

The math stops being a debate pretty fast.

---

## Deploy It Yourself

Copy-paste this into https://console.akash.network and you’re live:

```yaml
services:
  phi3-api:
    image: ghcr.io/toxmon/phi-3-mini-4k-llamaedge:cuda12-652d3f4
    expose:
      - port: 8080
        as: 80
        to:
          - global: true
    env:
      - WASMEDGE_PLUGIN_PATH=/opt/wasmedge/plugin

profiles:
  compute:
    phi3-api:
      resources:
        cpu: { units: 2 }
        memory: { size: 8Gi }
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia:
                - model: a100
                - model: h100
                - model: rtx4090
```

Full SDL with placement and pricing in the repo. CPU variant too.

---

## Why This Matters

**For Akash:** 3.1M deployments in 2025, up 466% YoY. $3.15M spent on the network, up 128%. 800+ GPUs onboarded through incentive programs. But most of those 3.1M deployments are simple web apps. GPU AI inference is the frontier, and most builders hit the same 8 walls I described above and give up. This project proves it works end to end with reproducible artifacts.

**For WasmEdge:** 10.5K GitHub stars. CNCF Sandbox project. 496K Docker pulls. The runtime is legit. But the docs gap is brutal — version compatibility undocumented, plugin installation broken for anything below 0.15.0, tarball structures change without notice. Michael Yuan has talked about Python’s "3GB problem" — WasmEdge is supposed to be the answer. But if builders can’t actually deploy it, the thesis stays academic. This repo is the working reference that should exist but doesn’t.

---

## The Meta-Narrative

An AI agent wrote a Dockerfile. Debugged runtime crashes. Navigated undocumented ABI breaks. Pushed a container image. Generated infrastructure-as-code. Deployed on a decentralized GPU network.

From a phone.

The Linux Foundation called autonomous agents "atomic primitives" of the next computing era. This is what that looks like. Not a demo. Not a proof of concept. A working LLM endpoint with a chat UI and an OpenAI-compatible API.

Agents deploying agents. AI building AI infrastructure.

---

## The Repo

https://github.com/ToXMon/phi-3-mini-4k-llamaedge

- Dockerfile (CPU) + Dockerfile.cuda12 (GPU)
- deploy-cpu.yaml + deploy-gpu.yaml (Akash SDLs)
- GitHub Actions CI/CD (auto-builds on push)
- GHCR images: ghcr.io/toxmon/phi-3-mini-4k-llamaedge
- README with every pitfall documented, every fix explained

Built by @fr0gger1. Orchestrated by Agent Zero.

---

Fork it. Deploy it. Break it. Fix it. That’s the point.

The infrastructure is permissionless. The tooling is open source. The agent that built it is open source.

You don’t need AWS credentials. You don’t need a DevOps team. You don’t need a laptop.

You need a wallet, a phone, and the willingness to ship.

@akashnet_ @WasmEdge @secondstate @fr0gger1
