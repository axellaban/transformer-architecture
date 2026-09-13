#!/usr/bin/env python3
"""Genera la narración en español del recorrido de un minuto.

Sintetiza una línea por capítulo con Piper (voz es_MX-claude-high), ajusta la
velocidad de cada línea para que entre en su capítulo y mezcla todo sobre una
pista de 60 segundos alineada con el reloj de `dist/story.mjs`.

Requisitos (solo para regenerar el audio, no para ejecutar la app):

    pip install piper-tts
    curl -L -o voz.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-claude-high.tar.bz2
    tar xjf voz.tar.bz2
    python3 scripts/build_narration.py --voice vits-piper-es_MX-claude-high/es_MX-claude-high.onnx

Salida: dist/assets/narracion-es.mp3
"""
import argparse
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORY = ROOT / "dist" / "story.mjs"
OUTPUT = ROOT / "dist" / "assets" / "narracion-es.mp3"

# Una línea por capítulo de story.mjs, en el mismo orden. Los términos en inglés
# se escriben tal y como deben sonar en español ("Dípsik" = DeepSeek, "fid fórward"
# = feed-forward), porque Piper los pronuncia con reglas españolas.
LINES = {
    "workload": "Nueve años separan estas dos arquitecturas: el mismo diseño, pero mucho más profundo.",
    "attention": "En el original, cada palabra mira a todas las demás, y eso se encarece cuando el texto crece. Dípsik mira solo lo que importa, sin perder lo reciente.",
    "reuse": "Y no repite trabajo: unas pocas capas construyen la memoria y las demás la reutilizan. Recuerda mucho más y gasta menos.",
    "experts": "Antes toda la red trabajaba en cada palabra. Ahora hay cientos de expertos y solo se activan unos pocos.",
    "residuals": "La información ya no viaja por un carril, sino por cuatro en paralelo.",
    "engram": "Además suma una memoria propia, aprendida durante el entrenamiento, que guarda conocimiento aparte de la conversación.",
    "vision": "Y ya no solo lee: también ve. Las imágenes entran troceadas y se traducen a su lenguaje interno.",
    "drafting": "Los dos predicen la siguiente palabra. Pero Dípsik se adelanta: escribe varias de una vez y las revisa.",
}

LEAD_IN = 0.15          # silencio antes de cada línea, dentro de su capítulo
TAIL = 0.20             # aire que se reserva al final de cada capítulo
MIN_LENGTH_SCALE = 0.80  # límite de aceleración para que la voz siga sonando natural


def chapters_from_story():
    """Lee id y duración de cada capítulo directamente de story.mjs."""
    source = STORY.read_text(encoding="utf8")
    found = re.findall(r"\{id:'([a-z]+)',name:'[^']*',title:'[^']*',duration:(\d+)", source)
    if not found:
        sys.exit("No se pudieron leer los capítulos de dist/story.mjs")
    start, chapters = 0.0, []
    for cid, duration in found:
        chapters.append({"id": cid, "start": start, "duration": float(duration)})
        start += float(duration)
    return chapters


def duration_of(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def synthesize(text, voice, length_scale, destination):
    subprocess.run(
        [sys.executable, "-m", "piper", "--model", str(voice),
         "--length_scale", f"{length_scale:.3f}", "--sentence_silence", "0.08",
         "--output_file", str(destination)],
        input=text, text=True, check=True, capture_output=True)


def trim_silence(source, destination):
    threshold = "start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(source),
         "-af", f"silenceremove={threshold},areverse,silenceremove={threshold},areverse,"
                "afade=t=in:st=0:d=0.05",
         str(destination)], check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True, help="Ruta al modelo .onnx de Piper")
    parser.add_argument("--output", default=str(OUTPUT))
    args = parser.parse_args()

    voice = Path(args.voice).resolve()
    if not voice.exists():
        sys.exit(f"No existe el modelo de voz: {voice}")

    chapters = chapters_from_story()
    total = sum(c["duration"] for c in chapters)
    report = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        clips = []
        for chapter in chapters:
            text = LINES[chapter["id"]]
            budget = chapter["duration"] - LEAD_IN - TAIL
            raw, clip = tmp / f"{chapter['id']}-raw.wav", tmp / f"{chapter['id']}.wav"

            length_scale = 1.0
            synthesize(text, voice, length_scale, raw)
            trim_silence(raw, clip)
            spoken = duration_of(clip)

            # Acelera lo justo para que la línea entre en su capítulo. La relación
            # entre length_scale y duración no es exacta, así que se afina iterando.
            for _ in range(8):
                if spoken <= budget or length_scale <= MIN_LENGTH_SCALE:
                    break
                length_scale = max(MIN_LENGTH_SCALE, length_scale * budget / spoken * 0.98)
                synthesize(text, voice, length_scale, raw)
                trim_silence(raw, clip)
                spoken = duration_of(clip)

            if spoken > budget + 0.01:
                sys.exit(f"La línea de '{chapter['id']}' dura {spoken:.2f}s y no entra en "
                         f"{budget:.2f}s ni al máximo de velocidad. Acorta el texto.")

            clips.append((chapter, clip, length_scale, spoken))
            report.append({"capitulo": chapter["id"], "inicio": chapter["start"] + LEAD_IN,
                           "duracion": round(spoken, 2), "velocidad": round(1 / length_scale, 3)})

        # Mezcla: una pista silenciosa de 60 s con cada línea retrasada hasta su capítulo.
        inputs, filters, labels = [], [], []
        for index, (chapter, clip, _, _) in enumerate(clips):
            inputs += ["-i", str(clip)]
            delay = int(round((chapter["start"] + LEAD_IN) * 1000))
            filters.append(f"[{index}:a]aresample=44100,adelay={delay}|{delay}[v{index}]")
            labels.append(f"[v{index}]")
        filters.append(
            f"{''.join(labels)}amix=inputs={len(clips)}:normalize=0:dropout_transition=0[mix]")
        filters.append(f"[mix]apad,atrim=0:{total},loudnorm=I=-18:TP=-1.5:LRA=11,"
                       f"afade=t=out:st={total - 0.5}:d=0.5[out]")

        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", *inputs,
             "-filter_complex", ";".join(filters), "-map", "[out]",
             "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k",
             "-metadata", "title=Transformer original vs DeepSeek — narración",
             "-metadata", "language=spa", str(args.output)], check=True)

    print(json.dumps({"salida": args.output, "duracion": round(duration_of(args.output), 2),
                      "capitulos": report}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
