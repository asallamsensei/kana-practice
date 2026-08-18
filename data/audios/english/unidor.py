from pathlib import Path
from pydub import AudioSegment
import re

# Carpeta donde se ejecuta el script
BASE = Path.cwd()

# Silencio entre audios (milisegundos)
PAUSA = AudioSegment.silent(duration=600)

# Obtener todos los mp3 excepto el resultado final
archivos = [
    f for f in BASE.glob("*.mp3")
    if f.name.lower() != "completo.mp3"
]

# Ordenar por número del nombre (1.mp3, 2.mp3, 10.mp3...)
def clave(f):
    m = re.search(r"\d+", f.stem)
    return int(m.group()) if m else float("inf")

archivos.sort(key=clave)

if not archivos:
    print("No se encontraron archivos MP3.")
    exit()

audio_final = AudioSegment.empty()

for i, archivo in enumerate(archivos):
    print(f"Agregando: {archivo.name}")

    audio = AudioSegment.from_mp3(archivo)
    audio_final += audio

    if i < len(archivos) - 1:
        audio_final += PAUSA

salida = BASE / "completo.mp3"
audio_final.export(salida, format="mp3")

print(f"\n✅ Listo: {salida.name}")
