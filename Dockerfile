# LlamaEdge Phi-3-mini-4k-instruct + all-MiniLM-L6-v2
# CPU-only image — WasmEdge 0.15.0 with wasi_nn-ggml plugin
#
# KEY: cp -a preserves symlinks. The release tarball has:
#   lib/libwasmedge.so -> libwasmedge.so.0 -> libwasmedge.so.0.0.0
# Using find -type f missed the symlinks, causing runtime load failure.

FROM ubuntu:22.04 AS builder

ARG WASMEDGE_VERSION=0.15.0
ARG LLAMAEDGE_VERSION=0.29.0

RUN apt-get update && apt-get install -y \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── WasmEdge runtime (cp -a preserves symlinks) ──
RUN tmpdir=$(mktemp -d) \
    && curl -sL -o /tmp/wasmedge.tar.gz \
    "https://github.com/WasmEdge/WasmEdge/releases/download/${WASMEDGE_VERSION}/WasmEdge-${WASMEDGE_VERSION}-manylinux_2_28_x86_64.tar.gz" \
    && tar xzf /tmp/wasmedge.tar.gz -C "$tmpdir" \
    && rm /tmp/wasmedge.tar.gz \
    && root=$(find "$tmpdir" -mindepth 1 -maxdepth 1 -type d | head -1) \
    && mkdir -p /opt/wasmedge \
    && cp -a "$root"/* /opt/wasmedge/ \
    && rm -rf "$tmpdir" \
    && test -f /opt/wasmedge/bin/wasmedge \
    || { echo "FATAL: wasmedge binary not found"; exit 1; }

# ── wasi_nn-ggml plugin (cp -a preserves symlinks) ──
RUN tmpdir=$(mktemp -d) \
    && curl -sL -o /tmp/nn_plugin.tar.gz \
    "https://github.com/WasmEdge/WasmEdge/releases/download/${WASMEDGE_VERSION}/WasmEdge-plugin-wasi_nn-ggml-${WASMEDGE_VERSION}-manylinux_2_28_x86_64.tar.gz" \
    && tar xzf /tmp/nn_plugin.tar.gz -C "$tmpdir" \
    && rm /tmp/nn_plugin.tar.gz \
    && find "$tmpdir" -name "*.so*" -exec cp -a {} /opt/wasmedge/plugin/ \; \
    && rm -rf "$tmpdir" \
    && ls -la /opt/wasmedge/plugin/ \
    || { echo "FATAL: plugin extraction failed"; exit 1; }

# ── Phi-3-mini-4k-instruct Q5_K_M (2.62 GiB) ──
RUN mkdir -p /app \
    && curl -sL \
    "https://huggingface.co/second-state/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q5_K_M.gguf" \
    -o /app/Phi-3-mini-4k-instruct-Q5_K_M.gguf

# ── all-MiniLM-L6-v2 embedding model (43 MiB) ──
RUN curl -sL \
    "https://huggingface.co/gaunernst/all-MiniLM-L6-v2/resolve/main/ggml-model-f16.gguf" \
    -o /app/all-MiniLM-L6-v2-ggml-model-f16.gguf

# ── LlamaEdge API server WASM ──
RUN curl -sL \
    "https://github.com/second-state/LlamaEdge/releases/download/${LLAMAEDGE_VERSION}/llama-api-server.wasm" \
    -o /app/llama-api-server.wasm

# ── Chatbot UI ──
RUN curl -sL \
    "https://github.com/LlamaEdge/chatbot-ui/releases/latest/download/chatbot-ui.tar.gz" \
    -o /tmp/chatbot-ui.tar.gz \
    && mkdir -p /app/chatbot-ui \
    && tar xzf /tmp/chatbot-ui.tar.gz -C /app/chatbot-ui --strip-components=1 \
    && rm /tmp/chatbot-ui.tar.gz

# ─────────────────────────────────────────────
# Runtime stage — lean Ubuntu 22.04
# ─────────────────────────────────────────────
FROM ubuntu:22.04

# libgomp for OpenMP (ggml CPU parallelism)
RUN apt-get update && apt-get install -y \
    libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ldconfig

COPY --from=builder /opt/wasmedge /opt/wasmedge
COPY --from=builder /app /app

ENV PATH="/opt/wasmedge/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/wasmedge/lib"
ENV WASMEDGE_PLUGIN_PATH="/opt/wasmedge/plugin"

WORKDIR /app
EXPOSE 8080

ENTRYPOINT ["/opt/wasmedge/bin/wasmedge", \
    "--dir", ".:/app", \
    "--dir", "chatbot-ui:/app/chatbot-ui", \
    "--nn-preload", "default:GGML:AUTO:Phi-3-mini-4k-instruct-Q5_K_M.gguf", \
    "--nn-preload", "embedding:GGML:AUTO:all-MiniLM-L6-v2-ggml-model-f16.gguf", \
    "llama-api-server.wasm", \
    "--model-name", "phi-3-mini,all-MiniLM-L6-v2", \
    "--prompt-template", "phi-3-chat,embedding", \
    "--ctx-size", "4000,384", \
    "--port", "8080", \
    "--web-ui", "chatbot-ui"]
