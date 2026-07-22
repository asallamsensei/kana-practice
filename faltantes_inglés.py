import json
from pathlib import Path

# Ejecutar desde la carpeta base del proyecto
BASE = Path.cwd()

JSON_FILE = BASE / "data" / "english_vocab.json"
AUDIO_FOLDER = BASE / "data" / "audios" / "english"

with open(JSON_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

existen = []
faltan = []

for bloque in data.get("bloques", []):
    for item in bloque.get("vocabulario", []):
        nombre = item.get("en", "").strip()

        if not nombre:
            continue

        archivo = AUDIO_FOLDER / f"{nombre}.mp3"

        if archivo.exists():
            existen.append(nombre)
        else:
            faltan.append(nombre)

# Eliminar duplicados y ordenar
existen = sorted(set(existen), key=str.lower)
faltan = sorted(set(faltan), key=str.lower)

print("=" * 60)
print(f"AUDIOS ENCONTRADOS ({len(existen)})")
print("=" * 60)
for nombre in existen:
    print(nombre)

print("\n" + "=" * 60)
print(f"AUDIOS FALTANTES ({len(faltan)})")
print("=" * 60)
for nombre in faltan:
    print(nombre)
