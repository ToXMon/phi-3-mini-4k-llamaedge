import { WEBLLM_MODEL_ID } from '../chat/webllmEngine'
import type { ModelDefinition } from './types'

export const DEFAULT_MODEL_ID = 'phi-3-mini-4k-instruct'

export const MODELS: readonly ModelDefinition[] = [
  {
    id: DEFAULT_MODEL_ID,
    name: 'Phi-3 Mini 4K',
    description: 'A compact instruction model optimized for local WebGPU chat in-browser.',
    estimatedSize: '~2.2 GB',
    sourceUrl: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC',
    isDefault: true,
    webllmModelId: WEBLLM_MODEL_ID,
  },
] as const

export function getDefaultModel() {
  return MODELS.find((model) => model.isDefault) ?? MODELS[0]
}
