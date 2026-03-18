# LlamaEdge Phi-3 Mini 4K - GHCR Images

Docker images for running Phi-3 Mini 4K instruct model with LlamaEdge (WasmEdge).

## Images

| Tag | Base | Description |
|-----|------|-------------|
| `:latest` | ubuntu:22.04 | CPU-only image |
| `:cuda12` | nvidia/cuda:12.2.0 | NVIDIA GPU image |

## Features

- **Chat Model**: Phi-3-mini-4k-instruct-Q5_K_M.gguf (~2GB)
- **Embedding Model**: all-MiniLM-L6-v2 (~90MB)
- **API**: OpenAI-compatible REST API on port 8080
- **Web UI**: Built-in chatbot interface

## Usage

### Pull Image

```bash
docker pull ghcr.io/toxmon/phi-3-mini-4k-llamaedge:latest
```

### Run Container

```bash
docker run -d -p 8080:8080 ghcr.io/toxmon/phi-3-mini-4k-llamaedge:latest
```

### API Endpoints

- **Chat**: `POST /v1/chat/completions`
- **Embeddings**: `POST /v1/embeddings`
- **Models**: `GET /v1/models`
- **Web UI**: `GET /`

## Akash Deployment

Use the SDL files in this repo for Akash Network deployment.

## Building

Images are automatically built via GitHub Actions when changes are pushed to main/master branch.
