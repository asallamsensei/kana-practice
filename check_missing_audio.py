import json
import os

# rutas
json_path = "data/turista.json"
audio_folder = "data/audios/turista"

# cargar json
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

faltantes = []

for entrada in data:
    romaji = entrada["romaji"]
    audio_path = os.path.join(audio_folder, romaji + ".mp3")

    if not os.path.exists(audio_path):
        faltantes.append(romaji)

print("----- AUDIOS FALTANTES -----\n")

for r in faltantes:
    print(r)

print(f"\nTotal faltantes: {len(faltantes)}")
