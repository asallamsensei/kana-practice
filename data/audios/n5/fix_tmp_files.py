from pathlib import Path
import re

# IMPORTANTE:
# Pega aquí tu RENAME_MAP (el mismo del script grande) o por lo menos
# las líneas que ya tengas. Si no lo pegas, igual el script puede "revertir"
# los TMP a su nombre original.

RENAME_MAP = {
    # EJEMPLO:
    # "上げる.mp3": "ageru_2.mp3",
    # "あげる.mp3": "ageru.mp3",
}

TMP_RE = re.compile(r"^__TMP__(.+?)__(\.mp3)$", re.IGNORECASE)

def extract_old_name(tmp_name: str) -> str | None:
    m = TMP_RE.match(tmp_name)
    if not m:
        return None
    stem = m.group(1)
    return stem + ".mp3"

def main():
    folder = Path(".").resolve()

    tmp_files = sorted([p for p in folder.glob("__TMP__*__.mp3") if p.is_file()])
    if not tmp_files:
        print("✅ No hay archivos __TMP__*.mp3")
        return

    fixed_to_target = 0
    reverted = 0
    skipped = 0

    for tmp in tmp_files:
        old_name = extract_old_name(tmp.name)
        if not old_name:
            print(f"⚠ No pude parsear: {tmp.name}")
            skipped += 1
            continue

        # Si el mapping existe y el destino no existe, finalizamos → romaji.mp3
        if old_name in RENAME_MAP:
            target = folder / RENAME_MAP[old_name]
            if target.exists():
                print(f"⚠ DESTINO YA EXISTE, no puedo finalizar: {tmp.name} → {target.name}")
                # mejor revertir al original si está libre
            else:
                tmp.rename(target)
                print(f"✔ FINALIZADO: {tmp.name} → {target.name}")
                fixed_to_target += 1
                continue

        # Si no hay mapping (o había colisión), revertimos → original.mp3
        original = folder / old_name
        if original.exists():
            # ya existe el original, no tocamos este tmp (algo raro / duplicado)
            print(f"⚠ ORIGINAL YA EXISTE, no puedo revertir: {tmp.name} → {old_name}")
            skipped += 1
            continue

        tmp.rename(original)
        print(f"↩ REVERTIDO: {tmp.name} → {old_name}")
        reverted += 1

    print("\n=== RESUMEN ===")
    print(f"Finalizados a romaji: {fixed_to_target}")
    print(f"Revertidos a original: {reverted}")
    print(f"Saltados: {skipped}")

if __name__ == "__main__":
    main()
