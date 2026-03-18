# ─────────────────────────────────────────────
# LlamaEdge — Phi-3-mini-4k + all-MiniLM (CPU)
# OpenAI-compatible API server on port 8080
# chatbot-ui baked in
# ─────────────────────────────────────────────

FROM ubuntu:22.04 AS builder

ARG WASMEDGE_VERSION=0.14.1
ARG LLAMAEDGE_VERSION=0.29.0

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install WasmEdge runtime + GGML plugin
RUN curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install_v2.sh \
    | bash -s -- -v ${WASMEDGE_VERSION} && \
    echo "WasmEdge installed"

# Download Phi-3-mini-4k-instruct Q5_K_M (2.82GB — best quality/size)
RUN curl -L --progress-bar \
    "https://huggingface.co/second-state/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q5_K_M.gguf" \
    -o /Phi-3-mini-4k-instruct-Q5_K_M.gguf

# Download all-MiniLM-L6-v2 embedding model (enables /v1/embeddings endpoint)
RUN curl -L --progress-bar \
    "https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-ggml-model-f16.gguf" \
    -o /all-MiniLM-L6-v2-ggml-model-f16.gguf

# Download llama-api-server.wasm (OpenAI-compatible API server binary)
RUN curl -L \
    "https://github.com/LlamaEdge/LlamaEdge/releases/download/${LLAMAEDGE_VERSION}/llama-api-server.wasm" \
    -o /llama-api-server.wasm

# Download chatbot-ui (baked-in web interface served at /)
RUN curl -L \
    "https://github.com/LlamaEdge/chatbot-ui/releases/latest/download/chatbot-ui.tar.gz" \
    -o /chatbot-ui.tar.gz && \
    mkdir /chatbot-ui && \
    tar xzf /chatbot-ui.tar.gz -C /chatbot-ui && \
    rm /chatbot-ui.tar.gz

# ─────────────────────────────────────────────
# Runtime stage — lean Ubuntu, no Python
# ─────────────────────────────────────────────
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    libopenblas-dev \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy WasmEdge runtime binaries
COPY --from=builder /root/.wasmedge/bin/wasmedge /usr/local/bin/wasmedge
COPY --from=builder /root/.wasmedge/lib/ /usr/local/lib/
COPY --from=builder /root/.wasmedge/plugin/ /root/.wasmedge/plugin/

# Copy app artifacts
COPY --from=builder /llama-api-server.wasm     /app/llama-api-server.wasm
COPY --from=builder /Phi-3-mini-4k-instruct-Q5_K_M.gguf /app/Phi-3-mini-4k-instruct-Q5_K_M.gguf
COPY --from=builder /all-MiniLM-L6-v2-ggml-model-f16.gguf /app/all-MiniLM-L6-v2-ggml-model-f16.gguf
COPY --from=builder /chatbot-ui /app/chatbot-ui

RUN ldconfig

WORKDIR /app
EXPOSE 8080

# chat model: phi-3-chat template, 4000 ctx
# embedding model: all-MiniLM, 384 ctx
ENTRYPOINT ["wasmedge", \
  "--dir", ".:/app", \
  "--nn-preload", "default:GGML:AUTO:Phi-3-mini-4k-instruct-Q5_K_M.gguf", \
  "--nn-preload", "embedding:GGML:AUTO:all-MiniLM-L6-v2-ggml-model-f16.gguf", \
  "/app/llama-api-server.wasm", \
  "--model-name", "phi-3-mini,all-MiniLM-L6-v2", \
  "--prompt-template", "phi-3-chat,embedding", \
  "--ctx-size", "4000,384", \
  "--port", "8080", \
  "--web-ui", "/app/chatbot-ui"]
