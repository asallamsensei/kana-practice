import re
from pathlib import Path

# =======================
# CONFIG
# =======================
EXT = ".mp3"
DRY_RUN = False   # <-- ponlo en False para renombrar de verdad

# =======================
# PEGA / ACTUALIZA AQUI
# JP (stem) -> romaji (stem)
# Ej: "がんばってね！": "ganbatte_ne"
# =======================
MAP = {
    # --- BLOQUE 1 ---
    # "あたしだって": "atashi_datte",
}

# --- BLOQUE ATM / SALUDOS / COMIDA ---
MAP.update({

    "ATM": "atm",
    "JRパスはここで使えますか？": "jr_pasu_wa_koko_de_tsukaemasu_ka",
    "ありがとうございました": "arigatou_gozaimashita",
    "いってきます": "ittekimasu",
    "いってらっしゃい": "itterasshai",
    "いらっしゃいませ": "irasshaimase",
    "うどん": "udon",
    "おかえり": "okaeri",
    "おかえりなさい": "okaerinasai",
    "おでん": "oden",
    "おにぎり": "onigiri",
    "おはよう": "ohayou",
    "おはようございます": "ohayou_gozaimasu",
    "おやすみ": "oyasumi",
    "おやすみなさい": "oyasuminasai",
    "おりものシート": "orimono_shiito",
    "お世話になりました": "osewa_ni_narimashita",
    "お元気ですか？": "ogenki_desu_ka",
    "お先に失礼します": "osaki_ni_shitsurei_shimasu",
    "お大事に": "odaiji_ni",
    "お好み焼き": "okonomiyaki",
    "お好み焼きをひとつください。": "okonomiyaki_wo_hitotsu_kudasai",
    "お寺": "otera",
    "お気をつけて": "oki_wo_tsukete",
    "お疲れさま": "otsukaresama",
    "お茶": "ocha",
    "かき氷": "kakigoori",
    "こんにちは": "konnichiwa",
    "こんばんは": "konbanwa",
    "ご飯": "gohan",
    "さようなら": "sayounara",
    "じゃあね": "jaa_ne",
    "じゃあまたね": "jaa_mata_ne",
    "すみません、これはいくらですか？": "sumimasen_kore_wa_ikura_desu_ka",
    "せんべい": "senbei",
    "そば": "soba",
    "たい焼き": "taiyaki",
    "たい焼きをください。": "taiyaki_wo_kudasai",
    "たこ焼き": "takoyaki",
    "ただいま": "tadaima",
    "ただいま戻りました": "tadaima_modorimashita",
    "ではまた": "dewa_mata",
    "とんかつ": "tonkatsu",
    "どうも": "doumo",
    "またあとで": "mata_atode",
    "またね": "mata_ne",
    "また会いましょう": "mata_aimashou",
    "もしもし": "moshi_moshi",
    "よう": "you",
    "ようこそ": "youkoso",
    "りんご": "ringo",

})

# --- BLOQUE 2 (konbini / bebidas / objetos) ---
MAP.update({

    "アイス": "aisu",
    "アイスクリーム": "aisu_kuriimu",
    "アルコール消毒": "arukooru_shoudoku",
    "イチゴ": "ichigo",
    "イヤホン": "iyahon",
    "ウェットティッシュ": "wetto_tisshu",
    "エナジードリンク": "enajii_dorinku",
    "オムライス": "omuraisu",
    "オムライスをお願いします。": "omuraisu_wo_onegaishimasu",
    "オレンジ": "orenji",
    "カルピス": "karupisu",
    "カレーパン": "karee_pan",
    "カード": "kaado",
    "ガム": "gamu",
    "キャリーケース": "kyarii_keesu",
    "クッキー": "kukkii",
    "コピー機": "kopii_ki",
    "コンドーム": "kondoomu",
    "コンビニ": "konbini",
    "コーヒー": "koohii",
    "コーラ": "koora",
    "サラダ": "sarada",
    "サンド": "sando",
    "サンドイッチ": "sandoicchi",
    "シャンプー": "shampuu",
    "ジャガイモ": "jagaimo",
    "ジャパンレールパス": "japan_reeru_pasu",
    "ジュース": "juusu",
    "スポーツドリンク": "supootsu_dorinku",
    "スーツケース": "suutsukeesu",
    "スーパー": "suupaa",
    "タクシー乗り場": "takushii_noriba",
    "タンポン": "tanpon",
    "チケット": "chiketto",
    "チューハイ": "chuu_hai",
    "チーズ": "chiizu",
    "デオドラント": "deodoranto",

})

# --- BLOQUE 3 (konbini / comida / lugares / objetos) ---
MAP.update({

    "デザート": "dezaato",
    "トイレ": "toire",
    "トイレはどこですか？": "toire_wa_doko_desu_ka",
    "トイレットペーパー": "toiretto_peepaa",
    "トイレットペーパーはどこですか？": "toiretto_peepaa_wa_doko_desu_ka",
    "トマト": "tomato",
    "ナプキン": "napukin",
    "ニンジン": "ninjin",
    "ハンカチ": "hankachi",
    "ハンドソープ": "hando_soopu",
    "ハンバーグ": "hanbaagu",
    "バイバイ": "baibai",
    "バス停": "basu_tei",
    "バナナ": "banana",
    "パスポート": "pasupooto",
    "パン": "pan",
    "ビザ": "biza",
    "ビル": "biru",
    "ビール": "biiru",
    "ピザ": "piza",
    "フライドポテト": "furaido_poteto",
    "ホテル": "hoteru",
    "ボディソープ": "bodii_soopu",
    "ポケットティッシュ": "poketto_tisshu",
    "ポテト": "poteto",
    "マスク": "masuku",
    "ミルク": "miruku",
    "メロン": "meron",
    "メロンソーダ": "meron_sooda",
    "モバイルバッテリー": "mobairu_batterii",
    "モール": "mooru",
    "ラムネ": "ramune",
    "ラーメン": "raamen",
    "ラーメンはありますか？": "raamen_wa_arimasu_ka",
    "レインコート": "rein_kooto",
    "レジ": "reji",
    "レジ袋": "reji_bukuro",
    "レストラン": "resutoran",
    "レモン": "remon",
    "ワイン": "wain",
    "両替": "ryougae",

})
# --- BLOQUE 4 (lugares / comida / ciudad) ---
MAP.update({

    "久しぶり": "hisashiburi",
    "乗車券": "joushaken",
    "乾杯！": "kanpai",
    "予約": "yoyaku",
    "交差点": "kousaten",
    "交番": "kouban",
    "会計": "kaikei",
    "信号": "shingou",
    "傘": "kasa",
    "元気だよ": "genki_da_yo",
    "元気です": "genki_desu",
    "元気？": "genki",
    "充電器": "juudenki",
    "入口": "iriguchi",
    "入場券": "nyuujouken",
    "公園": "kouen",
    "公衆トイレ": "koushuu_toire",
    "出口": "deguchi",
    "切符": "kippu",
    "刺身": "sashimi",
    "博物館": "hakubutsukan",
    "卵": "tamago",
    "卵焼き": "tamagoyaki",
    "味噌汁": "misoshiru",
    "和菓子": "wagashi",
    "喫煙所": "kitsuenjo",
    "団子": "dango",
    "図書館": "toshokan",
    "地下鉄": "chikatetsu",
    "坂": "saka",
    "天ぷら": "tempura",
    "学校": "gakkou",
    "家": "ie",
    "容器": "youki",
    "寿司": "sushi",
    "展望台": "tenboudai",

})

# --- BLOQUE 5 (viaje / comida / transporte) ---
MAP.update({

    "川": "kawa",
    "市場": "ichiba",
    "広場": "hiroba",
    "店": "mise",
    "弁当": "bentou",
    "往復": "oufuku",
    "手荷物": "tenimotsu",
    "指定席": "shiteiseki",
    "改札": "kaisatsu",
    "改札口": "kaisatsu_guchi",
    "新幹線": "shinkansen",
    "旅館": "ryokan",
    "日本酒": "nihonshu",
    "日焼け止め": "hiyakedome",
    "時刻表": "jikokuhyou",
    "有料": "yuuryou",
    "橋": "hashi",
    "歯ブラシ": "haburashi",
    "歯磨き": "hamigaki",
    "民宿": "minshuku",
    "水": "mizu",
    "海": "umi",
    "消毒液": "shoudokueki",
    "温泉": "onsen",
    "港": "minato",
    "炭酸水": "tansansui",
    "無料": "muryou",
    "焼きそば": "yakisoba",
    "焼きそばパン": "yakisoba_pan",
    "焼き肉": "yakiniku",
    "焼き芋": "yakiimo",
    "焼き魚": "yakizakana",
    "焼き鳥": "yakitori",
    "照り焼き": "teriyaki",
    "片道": "katamichi",
    "牛乳": "gyuunyuu",
    "牛乳パック": "gyuunyuu_pakku",
    "牛肉": "gyuuniku",
    "特急券": "tokkyuuken",
    "特急券が必要ですか？": "tokkyuuken_ga_hitsuyou_desu_ka",
    "現金": "genkin",

})
# --- BLOQUE 6 (salud / transporte / comida / turismo) ---
MAP.update({

    "生ビール": "nama_biiru",
    "生理用ナプキン": "seiriyou_napukin",
    "病院": "byouin",
    "石鹸": "sekken",
    "神社": "jinja",
    "禁煙": "kinnen",
    "税抜き": "zeinuki",
    "税込み": "zeikomi",
    "空港": "kuukou",
    "空港ターミナル": "kuukou_taaminaru",
    "窓側の席": "madogawa_no_seki",
    "窓側の席をお願いします。": "madogawa_no_seki_wo_onegaishimasu",
    "絆創膏": "bansoukou",
    "緑茶": "ryokucha",
    "缶コーヒー": "kan_koohii",
    "美術館": "bijutsukan",
    "肉": "niku",
    "自動販売機": "jidou_hanbaiki",
    "自由席": "jiyuuseki",
    "航空券": "koukuuken",
    "荷物": "nimotsu",
    "荷物を預けたいです。": "nimotsu_wo_azuketai_desu",
    "荷物預かり": "nimotsu_azukari",
    "薬局": "yakkyoku",
    "虫除けスプレー": "mushiyoke_supuree",
    "行ってまいります": "ittemairimasu",
    "袋": "fukuro",
    "親子丼": "oyakodon",
    "観光地": "kankouchi",
    "観光案内所": "kankou_annai_jo",
    "観覧車": "kanransha",
    "角": "kado",
    "豚肉": "butaniku",
    "遅延": "chien",
    "運休": "unkyu",
    "道": "michi",
    "郵便ポスト": "yuubin_posuto",
    "郵便局": "yuubinkyoku",
    "酒": "sake",
    "銀行": "ginkou",
    "電子レンジ": "denshi_renji",
    "領収書": "ryoushuusho",
    "食べ物": "tabemono",
    "飲み物": "nomimono",
    "餃子": "gyouza",
    "餅": "mochi",
    "駅": "eki",
    "駅弁": "ekiben",
    "駅弁はどこで買えますか？": "ekiben_wa_doko_de_kaemasu_ka",
    "駐車場": "chuushajou",
    "髭剃り": "higesori",
    "魚": "sakana",
    "鶏の照り焼き": "tori_no_teriyaki",
    "鶏肉": "toriniku",

})


# =======================
# Helpers
# =======================
def sanitize_stem(stem: str) -> str:
    """Nombre seguro: lowercase, a-z0-9_"""
    stem = stem.strip().lower().replace(" ", "_")
    stem = re.sub(r"_+", "_", stem)
    stem = re.sub(r"[^a-z0-9_]", "", stem)
    stem = stem.strip("_")
    return stem or "audio"

def unique_path(folder: Path, stem: str, ext: str) -> Path:
    """Si existe, agrega _2, _3..."""
    candidate = folder / f"{stem}{ext}"
    n = 2
    while candidate.exists():
        candidate = folder / f"{stem}_{n}{ext}"
        n += 1
    return candidate

def main():
    folder = Path(".").resolve()
    all_mp3 = sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == EXT])

    if not MAP:
        print("MAP está vacío. Pega tu bloque JP->romaji en MAP y vuelve a ejecutar.")
        return

    # Construimos operaciones (src -> tmp -> dst)
    ops = []
    missing = []
    for jp, romaji in MAP.items():
        src = folder / f"{jp}{EXT}"
        if not src.exists():
            missing.append(src.name)
            continue

        dst_stem = sanitize_stem(romaji)
        dst_final = unique_path(folder, dst_stem, EXT)
        tmp = unique_path(folder, f"__tmp__{dst_stem}", EXT)
        ops.append((src, tmp, dst_final))

    # Extras: archivos mp3 que están en carpeta pero no están en MAP
    jp_expected = set(f"{k}{EXT}" for k in MAP.keys())
    extras = [p.name for p in all_mp3 if p.name not in jp_expected and not p.name.startswith("__tmp__")]

    # Reporte
    print("\n======================")
    print(f"Carpeta: {folder}")
    print(f"DRY_RUN: {DRY_RUN}")
    print(f"En MAP: {len(MAP)}")
    print(f"Encontrados para renombrar: {len(ops)}")
    print("======================\n")

    if missing:
        print("---- MISS (no encontrados) ----")
        for name in missing:
            print("  -", name)
        print()

    if extras:
        print("---- EXTRA (mp3 no listados en MAP) ----")
        for name in extras[:200]:
            print("  -", name)
        if len(extras) > 200:
            print(f"  ... y {len(extras)-200} más")
        print()

    if not ops:
        print("No hay operaciones para ejecutar.")
        return

    # Mostrar plan
    print("---- PLAN ----")
    for src, _tmp, dst in ops:
        print(f"  {src.name}  ->  {dst.name}")
    print()

    if DRY_RUN:
        print("DRY_RUN=True: no se renombró nada. Cambia DRY_RUN a False para ejecutar.")
        return

    # Paso 1: temporales
    print("== Paso 1: temporales ==")
    for src, tmp, _dst in ops:
        print(f"  {src.name}  ->  {tmp.name}")
        src.rename(tmp)

    # Paso 2: finales
    print("\n== Paso 2: finales ==")
    for _src, tmp, dst in ops:
        print(f"  {tmp.name}  ->  {dst.name}")
        tmp.rename(dst)

    print("\n✔ Listo.")

if __name__ == "__main__":
    main()
