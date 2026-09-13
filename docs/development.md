# Desarrollo

## Aplicación

Sirve `dist/` por HTTP, como se explica en el README. No hay bundler ni instalación de dependencias. El import map de `dist/index.html` resuelve Three.js a los archivos vendorizados.

La aplicación carga `spatial-original.glb`, `spatial-deepseek.glb`, `detail_kit.glb`, `spatial-data.json` y `narracion-es.mp3`. Los experimentos de diseño anteriores no hacen falta en tiempo de ejecución.

Todo el texto visible vive en `dist/i18n.js`, `dist/story.mjs`, `dist/sources.js` y `dist/index.html`. Los datos del diagrama (`dist/assets/spatial-data.json`) conservan los identificadores y las etiquetas originales en inglés porque se generan desde Blender: `dist/i18n.js` los traduce en el momento de dibujarlos, así que regenerar los modelos no deshace la traducción.

## Blender

Abre `blender/architectures.blend` en Blender. Se creó con Blender 5.2.1 LTS. Las raíces `spatial_original` y `spatial_deepseek` contienen los modelos del navegador; el archivo conserva además el kit de detalle y disposiciones anteriores. Las etiquetas de texto siguen siendo editables en el archivo de Blender; la aplicación web dibuja las suyas.

Para reconstruir los dos modelos espaciales desde `blender/diagram-data.json`:

```bash
blender --background --python scripts/build_spatial_architecture.py
```

Esto actualiza los GLB y el grafo en `dist/assets/` y guarda la escena de Blender. Guarda o respalda antes tus cambios en la escena. El kit de detalle ya viene construido; reconstruirlo es opcional para ejecutar o editar la aplicación web.

## Narración

`dist/assets/narracion-es.mp3` dura exactamente lo mismo que la historia, así que la reproducción solo tiene que seguir el reloj de `dist/story.mjs`: cada capítulo empieza en su segundo. Si cambias los textos o las duraciones de los capítulos, regenera el audio.

La voz es [Piper](https://github.com/rhasspy/piper) con el modelo `es_MX-claude-high`. Para regenerarla:

```bash
pip install piper-tts
curl -L -o voz.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-claude-high.tar.bz2
tar xjf voz.tar.bz2
python3 scripts/build_narration.py --voice vits-piper-es_MX-claude-high/es_MX-claude-high.onnx
```

El guion está en `LINES`, dentro del propio script: una línea por capítulo, en el mismo orden que `story.mjs`. El registro es divulgativo a propósito: la voz explica para qué sirve cada cambio y los textos en pantalla aportan las cifras exactas, de modo que las dos capas se complementan en vez de repetirse. El script sintetiza cada línea, la acelera lo justo para que entre en su capítulo (nunca por encima de 1,25×) y las mezcla sobre una pista de 60 segundos. Escribe líneas que llenen su capítulo: si quedan cortas, la narración suena entrecortada por el silencio entre ellas. Si una línea no cabe ni al máximo de velocidad, el script falla y pide acortar el texto en lugar de dejar que se solape con el capítulo siguiente. Hace falta `ffmpeg` en el PATH.

Al terminar, el script escribe los doce primeros caracteres del hash del audio en la URL que usa `dist/app.js` (`assets/narracion-es.mp3?v=…`). La pista se sirve con caché de siete días, así que si la URL no cambiara al regenerarla los navegadores seguirían reproduciendo la versión vieja durante días. No edites esa URL a mano.

En reproducción, la pista se descarga entera y suena desde memoria: iOS ignora `preload` y descarga mientras reproduce, y cualquier tirón de red corta la narración. La sincronía con el reloj de la historia se mantiene estirando levemente `playbackRate`; solo se reposiciona en los saltos explícitos, porque en iOS cada búsqueda interrumpe el sonido.

Los términos en inglés se escriben en `LINES` tal como deben sonar en español (`Dípsik`, `fid fórward`), porque Piper los pronuncia con reglas del español.

## Terminología

Se traducen los términos con equivalente asentado en español: codificador, decodificador, autoatención, atención cruzada, atención multicabeza, enmascarada, codificación posicional, cabezas, expertos enrutados, experto compartido, borradores, caché.

Se mantienen en inglés los nombres propios del artículo o del modelo y los términos sin equivalente asentado: `Add & Norm` (etiqueta de la figura 1; su «Norm» es la normalización LayerNorm, no una norma), `embedding`, `token`, `feed-forward`, `softmax`, `backbone`, `prefill`, `logits`, `hash`, `benchmark`, y las siglas y nombres de mecanismo: SWA, MoE, CSA2, Full, Reuse, Reindex, Engram, DSpark, mHC, RoPE, YaRN, SwiGLU, ReLU, LayerNorm.

Los números siguen la convención de `es-ES`, la misma que produce `toLocaleString('es-ES')` en la aplicación: sin separador hasta cuatro cifras (2048, 5120) y con punto a partir de cinco (16.384, 129.280).

## Comprobaciones

Con Node.js 22 o posterior instalado:

```bash
npm test
```

No hace falta `npm install`. Las comprobaciones cubren los datos de arquitectura frente a la configuración congelada, los calendarios de productores de KV e índices, las máscaras causales, la correspondencia entre grafo y GLB, la contabilidad de caché, los tiempos de la historia, la reproducción y la continuidad de la cámara. No ejecutan los modelos neuronales ni miden la inferencia.

Para cambios visuales, revisa la aplicación cargada en anchos grandes y pequeños, y reproduce la historia entera. En móvil se muestra un modelo cada vez en el modo Explorar, y los dos a la vez en el modo historia.

## Alojamiento

Sube el contenido de `dist/` a cualquier alojamiento estático. Mantén la estructura de directorios para que el import map, los módulos y los recursos se resuelvan.

Para Vercel, `vercel.json` en la raíz del repositorio ya fija `dist` como directorio de salida, sin comando de compilación, así que importar el repositorio basta. La demo original usa GPT Sites; su configuración de despliegue, ligada a esa cuenta, no está en este repositorio a propósito.
