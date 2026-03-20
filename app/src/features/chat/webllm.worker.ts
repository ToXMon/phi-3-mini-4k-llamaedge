import { MLCEngine, WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
handler.engine = new MLCEngine()

self.onmessage = handler.onmessage.bind(handler)
