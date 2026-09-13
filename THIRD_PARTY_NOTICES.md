# Avisos de terceros

- **Three.js 0.180.0:** el runtime, OrbitControls, GLTFLoader y BufferGeometryUtils están vendorizados en `dist/vendor/`. Los derechos pertenecen a los autores de Three.js; el aviso MIT original se conserva en `dist/vendor/LICENSE`.
- **Attention Is All You Need:** Vaswani et al., 2017. La disposición del Transformer original se interpreta a partir de la figura 1. El artículo se enlaza, no se redistribuye. https://arxiv.org/abs/1706.03762
- **DeepSeek V4.1 Flash:** DeepSeek, 2026. La disposición moderna y la configuración factual vienen del informe técnico y de la configuración del modelo. `tests/fixtures/deepseek-config.json` es una configuración de referencia congelada para las comprobaciones numéricas; no son pesos ni código ejecutable del modelo. Fuente original: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/main/config.json
- **Piper:** la narración `dist/assets/narracion-es.mp3` se sintetizó con [Piper](https://github.com/rhasspy/piper) (MIT) y el modelo de voz `es_MX-claude-high`, entrenado sobre un conjunto de datos con licencia Apache-2.0 (https://huggingface.co/spaces/HirCoir/Piper-TTS-Spanish). El archivo de audio resultante forma parte de este proyecto; el modelo de voz no se redistribuye aquí y se descarga al regenerar el audio.

La licencia MIT del proyecto no relicencia los artículos referenciados, los materiales de modelos de terceros ni las marcas. Este es un proyecto educativo independiente.
