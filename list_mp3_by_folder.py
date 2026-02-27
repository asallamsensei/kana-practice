# list_mp3_by_folder.py
from pathlib import Path
import argparse
from collections import defaultdict

def main():
    p = argparse.ArgumentParser(description="Lista .mp3 agrupados por carpeta y guarda un .txt")
    p.add_argument("root", help="Carpeta raíz a escanear (ej: . o data/audios)")
    p.add_argument("-o", "--out", default="mp3_by_folder.txt", help="Archivo de salida (txt)")
    p.add_argument("--include-hidden", action="store_true", help="Incluir ocultos (rutas con partes que empiezan por .)")
    args = p.parse_args()

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"❌ No existe o no es carpeta: {root}")

    groups = defaultdict(list)

    for fp in sorted(root.rglob("*.mp3")):
        if not fp.is_file():
            continue

        # ocultos
        if not args.include_hidden:
            rel_parts = fp.relative_to(root).parts
            if any(part.startswith(".") for part in rel_parts):
                continue

        folder = fp.parent.relative_to(root).as_posix()  # carpeta relativa
        groups[folder].append(fp.name)                   # solo nombre del mp3

    out_lines = []
    total = 0

    for folder in sorted(groups.keys()):
        files = groups[folder]
        total += len(files)

        out_lines.append(f"=== {folder} ({len(files)} mp3) ===")
        for name in files:
            out_lines.append(f"- {name}")
        out_lines.append("")  # línea en blanco

    out_lines.append(f"TOTAL MP3: {total}")

    out_path = Path(args.out).resolve()
    out_path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")

    print(f"✅ Carpetas con mp3: {len(groups)}")
    print(f"✅ Total mp3: {total}")
    print(f"📄 TXT creado: {out_path}")

if __name__ == "__main__":
    main()
