import { WEBLLM_MODEL_ID } from '../chat/webllmEngine'
import type { ModelDefinition } from './types'

export const DEFAULT_MODEL_ID = 'phi-3-mini-4k-instruct'

export const MODELS: readonly ModelDefinition[] = [
  {
    id: DEFAULT_MODEL_ID,
    name: 'Phi-3 Mini 4K',
    size: '~2.2 GB',
    isDefault: true,
    webllmModelId: WEBLLM_MODEL_ID,
  },
] as const

export function getDefaultModel() {
  return MODELS.find((model) => model.isDefault) ?? MODELS[0]
}
