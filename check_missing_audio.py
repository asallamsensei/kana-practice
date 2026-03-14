import json
import os

json_path = "data/anime_vocab.json"
audio_folder = "data/audios/series"

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

faltantes = []
revisadas = 0


def revisar_entrada(obj):
    global revisadas

    if isinstance(obj, dict):
        # Si este dict parece una entrada de vocabulario
        if "romaji" in obj:
            romaji = str(obj["romaji"]).strip()
            if romaji:
                revisadas += 1
                audio_path = os.path.join(audio_folder, romaji + ".mp3")
                if not os.path.exists(audio_path):
                    faltantes.append(romaji)

        # Seguir recorriendo todos los valores del dict
        for valor in obj.values():
            revisar_entrada(valor)

    elif isinstance(obj, list):
        # Recorrer cada elemento de la lista
        for item in obj:
            revisar_entrada(item)


revisar_entrada(data)

# quitar duplicados manteniendo orden
faltantes_unicos = list(dict.fromkeys(faltantes))

print("\nAUDIOS FALTANTES:\n")
for r in faltantes_unicos:
    print(r)

print(f"\nEntradas con romaji revisadas: {revisadas}")
print(f"Total faltantes: {len(faltantes_unicos)}")
