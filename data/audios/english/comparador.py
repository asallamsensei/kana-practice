import json
from pathlib import Path

JSON_PATH = "english_vocab.json"
CARPETA_AUDIOS = ""

EXTENSION = ".mp3"

def normalizar_nombre(texto):
    return texto.strip().lower()

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

carpeta = Path(CARPETA_AUDIOS)

archivos_existentes = {
    normalizar_nombre(p.stem)
    for p in carpeta.glob(f"*{EXTENSION}")
}

faltantes = []

for bloque in data["bloques"]:
    for item in bloque["vocabulario"]:
        palabra_en = normalizar_nombre(item["en"])
        nombre_esperado = f"{item['en']}{EXTENSION}"

        if palabra_en not in archivos_existentes:
            faltantes.append(nombre_esperado)

print("\nAudios faltantes:\n")

if faltantes:
    for audio in faltantes:
        print(f"- {audio}")
else:
    print("No falta ningún audio.")
