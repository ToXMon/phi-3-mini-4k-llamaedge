# LlamaEdge Phi-3-mini-4k-instruct + all-MiniLM-L6-v2
# CPU-only image — WasmEdge 0.15.0 with wasi_nn-ggml plugin
#
# ROOT CAUSE FIX: Previous version used WasmEdge 0.14.1 which has NO
# pre-built wasi_nn-ggml plugin assets. The installer silently failed.
# Version 0.15.0 is the FIRST with pre-built wasi_nn-ggml plugin.
# We download assets directly and use find to locate files regardless
# of tarball internal directory structure.

FROM ubuntu:22.04 AS builder

ARG WASMEDGE_VERSION=0.15.0
ARG LLAMAEDGE_VERSION=0.29.0

RUN apt-get update && apt-get install -y \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── WasmEdge runtime (direct download, find-based extraction) ──
RUN tmpdir=$(mktemp -d) \
    && curl -sL -o /tmp/wasmedge.tar.gz \
    "https://github.com/WasmEdge/WasmEdge/releases/download/${WASMEDGE_VERSION}/WasmEdge-${WASMEDGE_VERSION}-manylinux_2_28_x86_64.tar.gz" \
    && tar xzf /tmp/wasmedge.tar.gz -C "$tmpdir" \
    && rm /tmp/wasmedge.tar.gz \
    && mkdir -p /opt/wasmedge/bin /opt/wasmedge/lib /opt/wasmedge/plugin \
    && find "$tmpdir" -type f -name "wasmedge" -exec cp {} /opt/wasmedge/bin/ \; \
    && find "$tmpdir" -type f -name "libwasmedge*.so*" -exec cp {} /opt/wasmedge/lib/ \; \
    && rm -rf "$tmpdir" \
    && test -f /opt/wasmedge/bin/wasmedge \
    || { echo "FATAL: wasmedge binary not found in release tarball"; exit 1; }

# ── wasi_nn-ggml plugin (direct download, find-based extraction) ──
RUN tmpdir=$(mktemp -d) \
    && curl -sL -o /tmp/nn_plugin.tar.gz \
    "https://github.com/WasmEdge/WasmEdge/releases/download/${WASMEDGE_VERSION}/WasmEdge-plugin-wasi_nn-ggml-${WASMEDGE_VERSION}-manylinux_2_28_x86_64.tar.gz" \
    && tar xzf /tmp/nn_plugin.tar.gz -C "$tmpdir" \
    && rm /tmp/nn_plugin.tar.gz \
    && find "$tmpdir" -name "libwasmedgePluginWasiNN.so" -exec cp {} /opt/wasmedge/plugin/ \; \
    && rm -rf "$tmpdir" \
    && test -f /opt/wasmedge/plugin/libwasmedgePluginWasiNN.so \
    || { echo "FATAL: wasi_nn-ggml plugin .so not found in release tarball"; exit 1; }

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
