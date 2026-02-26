#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
audit_filenames.py
Escanea el repositorio y reporta nombres de archivos potencialmente problemáticos:
- caracteres inválidos Windows: <>:"/\\|?*
- espacios al inicio/fin
- puntos o espacios al final (Windows los odia)
- rutas muy largas
- duplicados por case-insensitive (Linux/GitHub Pages te puede romper)
- colisiones por normalización Unicode (NFC vs NFD)
- (opcional) audita audios N5: JSON vs data/audios/n5

Uso:
  python tools/audit_filenames.py
"""

from __future__ import annotations
import os
import re
import json
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Set

# ===== Config =====
ROOT = Path(".").resolve()

# Carpetas típicas a ignorar
IGNORE_DIRS = {
    ".git", ".github",
    "node_modules", "__pycache__",
    ".vscode", ".idea",
    "dist", "build", "out",
}

# Archivos ocultos a ignorar por patrón (ajusta si quieres)
IGNORE_FILE_PATTERNS = [
    re.compile(r"^\.DS_Store$"),
]

# Límite razonable para rutas (Windows clásico ~260, aunque hoy puede ser más)
MAX_PATH_WARN = 240

INVALID_WIN_CHARS = r'<>:"/\\|?*'
invalid_win_re = re.compile(rf"[{re.escape(INVALID_WIN_CHARS)}]")

# Control chars (0x00-0x1F) y DEL (0x7F)
control_chars_re = re.compile(r"[\x00-\x1F\x7F]")

# “Look-alikes” invisibles frecuentes (espacios raros)
INVISIBLE_CHARS = [
    "\u200b",  # zero width space
    "\u200c",  # zero width non-joiner
    "\u200d",  # zero width joiner
    "\ufeff",  # BOM
]

# Auditoría de audios N5
N5_JSON = ROOT / "data" / "Vocabulario_N5.json"
N5_AUDIO_DIR = ROOT / "data" / "audios" / "n5"


@dataclass
class FileIssue:
    path: Path
    issues: List[str]


def should_ignore_file(name: str) -> bool:
    for pat in IGNORE_FILE_PATTERNS:
        if pat.match(name):
            return True
    return False


def walk_files(root: Path) -> List[Path]:
    all_files: List[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # filtrar carpetas ignoradas
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in filenames:
            if should_ignore_file(fn):
                continue
            all_files.append(Path(dirpath) / fn)
    return all_files


def find_invisible_chars(s: str) -> List[str]:
    found = []
    for ch in INVISIBLE_CHARS:
        if ch in s:
            found.append(f"contiene invisible U+{ord(ch):04X}")
    return found


def analyze_path(p: Path) -> List[str]:
    issues: List[str] = []
    name = p.name

    # 1) inválidos Windows
    if invalid_win_re.search(name):
        issues.append(f"carácter inválido Windows ({INVALID_WIN_CHARS})")

    # 2) control chars
    if control_chars_re.search(name):
        issues.append("contiene caracteres de control")

    # 3) espacios/puntos al final
    if name != name.strip():
        issues.append("tiene espacios al inicio/fin")
    if name.endswith(" ") or name.endswith("."):
        issues.append("termina en espacio o punto (problemático en Windows)")

    # 4) dobles extensiones raras
    if name.lower().endswith(".mp3.mp3"):
        issues.append("doble extensión .mp3.mp3")

    # 5) invisibles
    issues.extend(find_invisible_chars(name))

    # 6) ruta larga
    try:
        rel = p.resolve().relative_to(ROOT)
    except Exception:
        rel = p
    if len(str(rel)) > MAX_PATH_WARN:
        issues.append(f"ruta muy larga ({len(str(rel))} chars)")

    # 7) normalización unicode “no NFC”
    nfc = unicodedata.normalize("NFC", name)
    if name != nfc:
        issues.append("nombre no está en NFC (posible choque Unicode)")

    return issues


def detect_case_collisions(files: List[Path]) -> Dict[str, List[Path]]:
    """
    Detecta colisiones por case-insensitive.
    En Windows no se nota, en Linux sí: 'a.mp3' y 'A.mp3' serían distintos.
    GitHub Pages corre en Linux → puede romper rutas.
    """
    bucket: Dict[str, List[Path]] = {}
    for f in files:
        try:
            rel = f.resolve().relative_to(ROOT)
        except Exception:
            rel = f
        key = str(rel).lower()
        bucket.setdefault(key, []).append(rel)

    collisions = {k: v for k, v in bucket.items() if len(v) > 1}
    return collisions


def detect_unicode_collisions(files: List[Path]) -> Dict[str, List[Path]]:
    """
    Detecta colisiones por normalización Unicode:
    dos strings distintos pueden verse iguales en algunos sistemas.
    """
    bucket: Dict[str, List[Path]] = {}
    for f in files:
        try:
            rel = f.resolve().relative_to(ROOT)
        except Exception:
            rel = f
        key = unicodedata.normalize("NFC", str(rel))
        bucket.setdefault(key, []).append(rel)

    collisions = {k: v for k, v in bucket.items() if len(v) > 1}
    # OJO: aquí “colisión” significa que distintos paths normalizan igual
    # Filtramos solo si realmente hay diferencias
    real = {}
    for k, v in collisions.items():
        uniq = set(map(str, v))
        if len(uniq) > 1:
            real[k] = v
    return real


def audit_n5_audio() -> Tuple[List[str], List[str], List[str]]:
    """
    Verifica:
    - faltantes: cada item.kanji debería tener mp3 en data/audios/n5/<kanji>.mp3
    - sospechosos: kanji con / o cosas raras (no debería, pero por si acaso)
    - sobrantes: audios que no correspondan a ningún kanji del JSON
    """
    missing: List[str] = []
    suspicious: List[str] = []
    extra: List[str] = []

    if not N5_JSON.exists():
        return (["NO EXISTE data/Vocabulario_N5.json"], [], [])
    if not N5_AUDIO_DIR.exists():
        return ([], [], ["NO EXISTE data/audios/n5/"])

    try:
        data = json.loads(N5_JSON.read_text(encoding="utf-8"))
    except Exception as e:
        return ([f"NO SE PUDO LEER JSON: {e}"], [], [])

    expected: Set[str] = set()
    for it in (data or []):
        jp = str(it.get("kanji", "")).strip()
        if not jp:
            continue
        expected.add(jp)
        # chequeos sospechosos
        if "/" in jp or "\\" in jp:
            suspicious.append(f"kanji con slash: {jp}")
        if jp != unicodedata.normalize("NFC", jp):
            suspicious.append(f"kanji no NFC: {jp}")

        mp3 = N5_AUDIO_DIR / f"{jp}.mp3"
        if not mp3.exists():
            missing.append(jp)

    # audios extra (no en JSON)
    found_audio = []
    for p in N5_AUDIO_DIR.glob("*.mp3"):
        stem = p.stem  # nombre sin .mp3
        found_audio.append(stem)
    found_set = set(found_audio)

    for a in sorted(found_set - expected):
        extra.append(a)

    return (missing, suspicious, extra)


def main() -> int:
    files = walk_files(ROOT)

    issues: List[FileIssue] = []
    for f in files:
        rel = f.resolve().relative_to(ROOT)
        isues = analyze_path(f)
        if isues:
            issues.append(FileIssue(rel, isues))

    case_collisions = detect_case_collisions(files)
    unicode_collisions = detect_unicode_collisions(files)

    # ===== Report =====
    print("\n=== AUDITORÍA DE NOMBRES (Repo) ===")
    print(f"Root: {ROOT}")
    print(f"Archivos escaneados: {len(files)}")

    if issues:
        print(f"\n[!] Archivos con posibles problemas: {len(issues)}")
        for it in issues[:200]:
            print(f"- {it.path}")
            for msg in it.issues:
                print(f"    • {msg}")
        if len(issues) > 200:
            print(f"  ... ({len(issues)-200} más)")
    else:
        print("\n[OK] No se encontraron problemas comunes de nombres.")

    if case_collisions:
        print(f"\n[!!] COLISIONES por mayúsculas/minúsculas: {len(case_collisions)}")
        for k, paths in list(case_collisions.items())[:80]:
            print(f"- key(lower) = {k}")
            for p in paths:
                print(f"    • {p}")
        if len(case_collisions) > 80:
            print(f"  ... ({len(case_collisions)-80} más)")
    else:
        print("\n[OK] No hay colisiones por case-insensitive.")

    if unicode_collisions:
        print(f"\n[!!] COLISIONES por normalización Unicode (NFC): {len(unicode_collisions)}")
        for k, paths in list(unicode_collisions.items())[:80]:
            print(f"- NFC = {k}")
            for p in paths:
                print(f"    • {p}")
        if len(unicode_collisions) > 80:
            print(f"  ... ({len(unicode_collisions)-80} más)")
    else:
        print("\n[OK] No hay colisiones Unicode (NFC) detectadas.")

    # ===== N5 Audio audit =====
    missing, suspicious, extra = audit_n5_audio()
    print("\n=== AUDITORÍA AUDIOS N5 ===")
    print(f"JSON: {N5_JSON}")
    print(f"Audios: {N5_AUDIO_DIR}")

    if missing and not (len(missing)==1 and missing[0].startswith("NO ")):
        print(f"\n[!] Faltan audios para {len(missing)} entradas del JSON. Ejemplos:")
        for x in missing[:60]:
            print(f"  - {x}.mp3")
        if len(missing) > 60:
            print(f"  ... ({len(missing)-60} más)")
    elif missing:
        for x in missing:
            print(f"[!] {x}")
    else:
        print("\n[OK] No faltan audios según el JSON.")

    if extra:
        print(f"\n[!] Audios sobrantes (no están en el JSON): {len(extra)}")
        for x in extra[:60]:
            print(f"  - {x}.mp3")
        if len(extra) > 60:
            print(f"  ... ({len(extra)-60} más)")
    else:
        print("\n[OK] No hay audios sobrantes (o no se pudo auditar).")

    if suspicious:
        print(f"\n[!] Entradas sospechosas en el JSON: {len(suspicious)}")
        for x in suspicious[:80]:
            print(f"  - {x}")
        if len(suspicious) > 80:
            print(f"  ... ({len(suspicious)-80} más)")
    else:
        print("\n[OK] Nada sospechoso en kanji del JSON.")

    print("\nListo. Si quieres, te hago versión que también genere CSV/JSON para revisar fácil.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
