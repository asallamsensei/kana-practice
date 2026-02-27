import os
import re
from pathlib import Path

# ========= CONFIG =========
EXT = ".mp3"

# (JP filename) -> (romaji filename stem)
MAP = {
    "あたしだって": "atashi_datte",
    "いきなり": "ikinari",
    "お嬢ちゃん": "ojou_chan",
    "がんばってね！": "ganbatte_ne",
    "すごい": "sugoi",
    "たとえ闇に生きるとも": "tatoe_yami_ni_ikiru_tomo",
    "たどってる": "tadotteru",
    "どうするかさ！": "dou_suru_kasa",
    "どうなるかなんて": "dou_naru_ka_nante",
    "どうなるかよりも": "dou_naru_ka_yori_mo",
    "なんだか": "nandaka",
    "ひざまずく": "hizamazuku",
    "まっすぐ": "massugu",
    "もうすぐ": "mou_sugu",
    "わからない": "wakaranai",

    "エスパー": "esupaa",
    "エリート戦士": "eriito_senshi",
    "エンジェルスの諸君": "enjerusu_no_shokun",
    "カエル": "kaeru",
    "ジャングル": "janguru",
    "ジャンケン": "janken",
    "セーター": "seetaa",
    "チョコレートパフェ": "chokoreeto_pafe",
    "ハリケーン": "harikeen",
    "ピン": "pin",
    "ラジャー！": "rajaa",
    "ヴギィのエッチ！": "vugii_no_ecchi",

    "不思議な": "fushigi_na",
    "予感": "yokan",
    "健闘を祈る": "kentou_wo_inoru",
    "光": "hikari",
    "前を見据え": "mae_wo_misue",
    "力を集め": "chikara_woatsume",
    "勝てるのかなんて": "kateru_no_ka_nante",
    "只今参上!!": "tadaima_sanjou",
    "喜び": "yorokobi",
    "守ったよ": "mamotta_yo",
    "定め": "sadame",
    "届いたの": "todoita_no",
    "強い": "tsuyoi",
    "思い": "omoi",
    "恐怖": "kyoufu",
    "拳": "kobushi",
    "明日は無い": "ashita_wa_nai",
    "明日へ": "ashita_e",
    "時間": "jikan",
    "未来から": "mirai_kara",
    "毒ヤリ": "doku_yari",
    "決闘": "kettou",
    "泣く子も黙る": "naku_ko_mo_damaru",
    "無敵": "muteki",
    "特戦隊": "tokusentai",
    "眼に": "me_ni",
    "瞳": "hitomi",
    "砂漠に": "sabaku_ni",
    "突き進む": "tsukisusumu",
    "約束": "yakusoku",
    "裸": "hadaka",
    "誰なの": "dare_na_no",
    "謹慎処分": "kinshin_shobun",
    "豪快": "goukai",
    "赤いマグマ": "akai_magma",
    "鋭い刃に": "surudoi_yaiba_ni",
    "隊長": "taichou",
    "青い": "aoi",
    "順番決め": "junban_gime",
    "風のように": "kaze_no_you_ni",
}

# ========= Helpers =========
def sanitize_stem(stem: str) -> str:
    """
    Keep filenames safe: lowercase, underscores, a-z0-9 only.
    """
    stem = stem.strip().lower()
    stem = stem.replace(" ", "_")
    stem = re.sub(r"_+", "_", stem)
    stem = re.sub(r"[^a-z0-9_]", "", stem)
    stem = stem.strip("_")
    return stem or "audio"

def unique_path(folder: Path, stem: str, ext: str) -> Path:
    """
    If target exists, append _2, _3...
    """
    base = stem
    candidate = folder / f"{base}{ext}"
    n = 2
    while candidate.exists():
        candidate = folder / f"{base}_{n}{ext}"
        n += 1
    return candidate

def main():
    folder = Path(".").resolve()

    # Para no pisarnos con renombres intermedios, hacemos 2 pasos:
    # 1) Renombrar todo a temporales únicos
    # 2) Renombrar de temporales al destino final
    ops = []

    for jp, romaji_stem in MAP.items():
        src = folder / f"{jp}{EXT}"
        if not src.exists():
            print(f"[MISS] No existe: {src.name}")
            continue

        romaji_clean = sanitize_stem(romaji_stem)
        dst_final = unique_path(folder, romaji_clean, EXT)

        tmp = unique_path(folder, f"__tmp__{romaji_clean}", EXT)
        ops.append((src, tmp, dst_final))

    if not ops:
        print("\nNo hay nada que renombrar (o no encontró archivos).")
        return

    print("\n== Paso 1: a temporales ==")
    for src, tmp, _dst in ops:
        print(f"{src.name}  ->  {tmp.name}")
        src.rename(tmp)

    print("\n== Paso 2: a nombres finales ==")
    for _src, tmp, dst in ops:
        print(f"{tmp.name}  ->  {dst.name}")
        tmp.rename(dst)

    print("\n✔ Listo.")

if __name__ == "__main__":
    main()
