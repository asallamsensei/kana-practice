import json
from pathlib import Path

# Ejecutar desde la carpeta base del proyecto
BASE = Path.cwd()

JSON_FILE = BASE / "data" / "anime_vocab.json"
AUDIO_FOLDER = BASE / "data" / "audios" / "series"

with open(JSON_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

existen = []
faltan = []

for bloque in data.get("bloques", []):
    for item in bloque.get("vocabulario", []):
        jp = item.get("jp", "").strip()
        romaji = item.get("romaji", "").strip()

        if not romaji:
            continue

        archivo = AUDIO_FOLDER / f"{romaji}.mp3"

        if archivo.exists():
            existen.append((jp, romaji))
        else:
            faltan.append((jp, romaji))

# Eliminar duplicados
existen = list(set(existen))
faltan = list(set(faltan))

# Ordenar por romaji
existen.sort(key=lambda x: x[1].lower())
faltan.sort(key=lambda x: x[1].lower())


print("=" * 60)
print(f"AUDIOS ENCONTRADOS ({len(existen)})")
print("=" * 60)

for jp, romaji in existen:
    print(jp)


print("\n" + "=" * 60)
print(f"JAPONESES CON AUDIO FALTANTE ({len(faltan)})")
print("=" * 60)

for jp, romaji in faltan:
    print(jp)


print("\n" + "=" * 60)
print(f"ROMAJI FALTANTES ({len(faltan)})")
print("=" * 60)

for jp, romaji in faltan:
    print(romaji)
