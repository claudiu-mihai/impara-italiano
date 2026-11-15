"""Generează fișierele audio ale dialogurilor cu Qwen3-TTS (mlx_audio), cu voci clonate local.

Rulat de `npm run audio:dialogues` cu Python-ul din mediul în care e instalat mlx_audio (`$QWEN_TTS_DIR/.venv`).
Argumente: jobs.json (listă de {voice, text, file}), directorul de ieșire, report.json (durata fiecărui fișier).
"""

import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import time

import soundfile as sf
from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
# textul înregistrărilor de referință (<voce>_hd.wav), create cu modelul VoiceDesign
REF_TEXT = "Buongiorno! Come posso aiutarti oggi con il tuo progetto?"
# liniștea de la început și de la sfârșit se taie, ca replica să pornească imediat
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,"
    "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse"
)


def main(jobs_path: str, out_dir: str, report_path: str) -> None:
    voices_dir = os.path.expanduser(os.environ.get("QWEN_TTS_DIR", "~/qwen-tts"))
    with open(jobs_path, encoding="utf-8") as f:
        jobs = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    model = load_model(MODEL)
    report = []
    with tempfile.TemporaryDirectory() as tmp:
        for n, job in enumerate(jobs, 1):
            started = time.time()
            prefix = os.path.splitext(job["file"])[0]
            with contextlib.redirect_stdout(io.StringIO()):
                generate_audio(
                    text=job["text"],
                    model=model,
                    ref_audio=os.path.join(voices_dir, f"{job['voice']}_hd.wav"),
                    ref_text=REF_TEXT,
                    lang_code="it",
                    output_path=tmp,
                    file_prefix=prefix,
                    verbose=False,
                )
            wav = os.path.join(tmp, f"{prefix}_000.wav")
            mp3 = os.path.join(out_dir, job["file"])
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", TRIM, "-ac", "1", "-b:a", "64k", mp3],
                check=True,
            )
            seconds = sf.info(mp3).duration
            report.append({**job, "seconds": round(seconds, 2)})
            print(f"[{n}/{len(jobs)}] {job['voice']:9} {seconds:5.2f}s  {time.time() - started:4.1f}s  {job['text']}", flush=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
