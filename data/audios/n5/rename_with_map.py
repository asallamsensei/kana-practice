from pathlib import Path
import json
import argparse
from typing import Any, Dict

# =========================
# 1) AQUÍ PEGAS TUS CAMBIOS
#    clave: nombre actual (con .mp3)
#    valor: nombre nuevo (con .mp3)
# =========================
RENAME_MAP: Dict[str, str] = {}
RENAME_MAP.update({
  "〜てほしい.mp3": "~tehoshii.mp3",

  "あげる.mp3": "ageru.mp3",
  "あそこ.mp3": "asoko.mp3",
  "あちら.mp3": "achira.mp3",
  "あなた.mp3": "anata.mp3",
  "あの.mp3": "ano.mp3",
  "あまり.mp3": "amari.mp3",
  "ある.mp3": "aru.mp3",
  "あれ.mp3": "are.mp3",

  "いい.mp3": "ii.mp3",
  "いいえ.mp3": "iie.mp3",
  "いくつ.mp3": "ikutsu.mp3",
  "いくら.mp3": "ikura.mp3",
  "いつ.mp3": "itsu.mp3",
  "いつも.mp3": "itsumo.mp3",
  "いや.mp3": "iya.mp3",
  "いる.mp3": "iru.mp3",
  "いろいろ.mp3": "iroiro.mp3",

  "うち.mp3": "uchi.mp3",
  "うるさい.mp3": "urusai.mp3",

  "ええ.mp3": "ee.mp3",

  "おいしい.mp3": "oishii.mp3",
  "おばあさん.mp3": "obaasan.mp3",
  "おばさん.mp3": "obasan.mp3",
  "おまわりさん.mp3": "omawarisan.mp3",
  "お兄さん.mp3": "oniisan.mp3",
  "お姉さん.mp3": "oneesan.mp3",
  "お弁当.mp3": "obentou.mp3",
  "お手洗い.mp3": "otearai.mp3",
  "お母さん.mp3": "okaasan.mp3",
  "お父さん.mp3": "otousan.mp3",
  "お皿.mp3": "osara.mp3",
  "お腹.mp3": "onaka.mp3",
  "お茶.mp3": "ocha.mp3",
  "お菓子.mp3": "okashi.mp3",
  "お酒.mp3": "osake.mp3",
  "お金.mp3": "okane.mp3",
})
RENAME_MAP.update({
  "お風呂.mp3": "ofuro.mp3",

  "かかる.mp3": "kakaru.mp3",
  "かける.mp3": "kakeru.mp3",
  "かわいい.mp3": "kawaii.mp3",
  "きれい.mp3": "kirei.mp3",
  "ください.mp3": "kudasai.mp3",

  "ここ.mp3": "koko.mp3",
  "こちら.mp3": "kochira.mp3",
  "この.mp3": "kono.mp3",
  "これ.mp3": "kore.mp3",
  "こんな.mp3": "konna.mp3",

  "ご飯.mp3": "gohan.mp3",

  "さあ.mp3": "saa.mp3",
  "しかし.mp3": "shikashi.mp3",
  "じゃあ.mp3": "jaa.mp3",

  "すぐに.mp3": "suguni.mp3",
  "する.mp3": "suru.mp3",
  "そうして.mp3": "soushite.mp3",

  "そこ.mp3": "soko.mp3",
  "そして.mp3": "soshite.mp3",
  "そちら.mp3": "sochira.mp3",
  "その.mp3": "sono.mp3",
  "そば.mp3": "soba.mp3",
  "それ.mp3": "sore.mp3",
  "それから.mp3": "sorekara.mp3",
  "それでは.mp3": "soredewa.mp3",

  "たくさん.mp3": "takusan.mp3",
  "だれか.mp3": "dareka.mp3",
  "だんだん.mp3": "dandan.mp3",

  "ちょうど.mp3": "choudo.mp3",
  "ちょっと.mp3": "chotto.mp3",

  "ついたち.mp3": "tsuitachi.mp3",
  "つける.mp3": "tsukeru.mp3",
  "つまらない.mp3": "tsumaranai.mp3",
  "つらい.mp3": "tsurai.mp3",
})
RENAME_MAP.update({
  "できる.mp3": "dekiru.mp3",
  "では.mp3": "dewa.mp3",
  "でも.mp3": "demo.mp3",

  "とっても.mp3": "tottemo.mp3",
  "とても.mp3": "totemo.mp3",

  "どう.mp3": "dou.mp3",
  "どうして.mp3": "doushite.mp3",
  "どうぞ.mp3": "douzo.mp3",
  "どうも.mp3": "doumo.mp3",
  "どうやって.mp3": "douyatte.mp3",

  "どこ.mp3": "doko.mp3",
  "どちら.mp3": "dochira.mp3",
  "どなた.mp3": "donata.mp3",
  "どの.mp3": "dono.mp3",
  "どれ.mp3": "dore.mp3",

  "なくす.mp3": "nakusu.mp3",
  "なぜ.mp3": "naze.mp3",
  "など.mp3": "nado.mp3",

  "はい.mp3": "hai.mp3",
  "はがき.mp3": "hagaki.mp3",
  "ほか.mp3": "hoka.mp3",

  "まずい.mp3": "mazui.mp3",
  "また.mp3": "mata.mp3",
  "まだ.mp3": "mada.mp3",
  "まっすぐ.mp3": "massugu.mp3",

  "みんな.mp3": "minna.mp3",

  "もう.mp3": "mou.mp3",
  "もう一度.mp3": "mouichido.mp3",
  "もっと.mp3": "motto.mp3",

  "やさしい.mp3": "yasashii.mp3",
  "ゆっくり.mp3": "yukkuri.mp3",

  "よく.mp3": "yoku.mp3",
  "より.mp3": "yori.mp3",

  "わかる.mp3": "wakaru.mp3",

  "アパート.mp3": "apaato.mp3",
  "エレベーター.mp3": "erebeetaa.mp3",
  "カップ.mp3": "kappu.mp3",
})
RENAME_MAP.update({
  "カメラ.mp3": "kamera.mp3",
  "カレンダー.mp3": "karendaa.mp3",
  "カレー.mp3": "karee.mp3",

  "キロ.mp3": "kiro.mp3",
  "キログラム.mp3": "kiroguramu.mp3",
  "キロメートル.mp3": "kiromeetoru.mp3",

  "ギター.mp3": "gitaa.mp3",

  "クラス.mp3": "kurasu.mp3",
  "グラム.mp3": "guramu.mp3",

  "コップ.mp3": "koppu.mp3",
  "コピー.mp3": "kopii.mp3",
  "コート.mp3": "kooto.mp3",
  "コーヒー.mp3": "koohii.mp3",

  "シャツ.mp3": "shatsu.mp3",
  "シャワー.mp3": "shawaa.mp3",

  "スカート.mp3": "sukaato.mp3",
  "ストーブ.mp3": "sutoobu.mp3",
  "スプーン.mp3": "supuun.mp3",
  "スポーツ.mp3": "supootsu.mp3",
  "スリッパ.mp3": "surippa.mp3",

  "ズボン.mp3": "zubon.mp3",
  "セーター.mp3": "seetaa.mp3",

  "タクシー.mp3": "takushii.mp3",
  "タバコ.mp3": "tabako.mp3",

  "テスト.mp3": "tesuto.mp3",
  "テレビ.mp3": "terebi.mp3",
  "テーブル.mp3": "teeburu.mp3",
  "テープ.mp3": "teepu.mp3",
  "テープレコーダー.mp3": "teepurekoodaa.mp3",

  "デパート.mp3": "depaato.mp3",
  "トイレ.mp3": "toire.mp3",
  "ドア.mp3": "doa.mp3",

  "ナイフ.mp3": "naifu.mp3",
  "ニュース.mp3": "nyuusu.mp3",
  "ネクタイ.mp3": "nekutai.mp3",
  "ノート.mp3": "nooto.mp3",

  "ハンカチ.mp3": "hankachi.mp3",

  "バス.mp3": "basu.mp3",
  "バター.mp3": "bataa.mp3",

  "パン.mp3": "pan.mp3",
  "パーティー.mp3": "paatii.mp3",

  "フィルム.mp3": "firumu.mp3",
  "フォーク.mp3": "fooku.mp3",

  "プール.mp3": "puuru.mp3",

  "ベッド.mp3": "beddo.mp3",
  "ペット.mp3": "petto.mp3",
  "ペン.mp3": "pen.mp3",
})
RENAME_MAP.update({
  "ページ.mp3": "peeji.mp3",
  "ホテル.mp3": "hoteru.mp3",
  "ボタン.mp3": "botan.mp3",
  "ボールペン.mp3": "boorupen.mp3",
  "ポケット.mp3": "poketto.mp3",
  "ポスト.mp3": "posuto.mp3",
  "マッチ.mp3": "macchi.mp3",
  "メガネ.mp3": "megane.mp3",
  "メートル.mp3": "meetoru.mp3",
  "ラジオ.mp3": "rajio.mp3",
  "ラジカセ.mp3": "rajikase.mp3",
  "レコード.mp3": "rekoodo.mp3",
  "レストラン.mp3": "resutoran.mp3",
  "ワイシャツ.mp3": "waishatsu.mp3",

  "一.mp3": "ichi.mp3",
  "一つ.mp3": "hitotsu.mp3",
  "一人.mp3": "hitori.mp3",
  "一日.mp3": "ichinichi.mp3",
  "一昨年.mp3": "ototoshi.mp3",
  "一昨日.mp3": "ototoi.mp3",
  "一番.mp3": "ichiban.mp3",
  "一緒に.mp3": "isshoni.mp3",

  "七.mp3": "nana.mp3",
  "七2.mp3": "shichi_2.mp3",
  "七つ.mp3": "nanatsu.mp3",

  "万.mp3": "man.mp3",
  "万年筆.mp3": "mannenhitsu.mp3",

  "丈夫.mp3": "joubu.mp3",

  "三.mp3": "san.mp3",
  "三つ.mp3": "mittsu.mp3",

  "上.mp3": "ue.mp3",
  "上げる.mp3": "ageru.mp3",
  "上る.mp3": "noboru.mp3",
  "上手.mp3": "jouzu.mp3",
  "上着.mp3": "uwagi.mp3",

  "下.mp3": "shita.mp3",
  "下手.mp3": "heta.mp3",

  "両親.mp3": "ryoushin.mp3",

  "並ぶ.mp3": "narabu.mp3",
  "並べる.mp3": "naraberu.mp3",

  "中.mp3": "naka.mp3",
  "中2.mp3": "chuu_2.mp3",

  "丸い.mp3": "marui.mp3",
  "乗る.mp3": "noru.mp3",

  "九つ.mp3": "kokonotsu.mp3",

  "二.mp3": "ni.mp3",
  "二つ.mp3": "futatsu.mp3",
  "二人.mp3": "futari.mp3",
})
RENAME_MAP.update({
  "五.mp3": "go.mp3",
  "五つ.mp3": "itsutsu.mp3",

  "交差点.mp3": "kousaten.mp3",
  "交番.mp3": "kouban.mp3",

  "人.mp3": "hito.mp3",

  "今.mp3": "ima.mp3",
  "今年.mp3": "kotoshi.mp3",
  "今日.mp3": "kyou.mp3",
  "今晩.mp3": "konban.mp3",
  "今月.mp3": "kongetsu.mp3",
  "今朝.mp3": "kesa.mp3",
  "今週.mp3": "konshuu.mp3",

  "仕事.mp3": "shigoto.mp3",

  "休み.mp3": "yasumi.mp3",
  "休む.mp3": "yasumu.mp3",

  "会う.mp3": "au.mp3",
  "会社.mp3": "kaisha.mp3",

  "低い.mp3": "hikui.mp3",
  "住む.mp3": "sumu.mp3",
  "体.mp3": "karada.mp3",
  "何.mp3": "nani.mp3",

  "作る.mp3": "tsukuru.mp3",
  "作文.mp3": "sakubun.mp3",
  "使う.mp3": "tsukau.mp3",

  "便利.mp3": "benri.mp3",
  "借りる.mp3": "kariru.mp3",

  "側.mp3": "soba.mp3",
  "傘.mp3": "kasa.mp3",

  "働く.mp3": "hataraku.mp3",
  "元気.mp3": "genki.mp3",

  "兄.mp3": "ani.mp3",
  "兄弟.mp3": "kyoudai.mp3",

  "先.mp3": "saki.mp3",
  "先月.mp3": "sengetsu.mp3",
  "先生.mp3": "sensei.mp3",
  "先週.mp3": "senshuu.mp3",

  "入り口.mp3": "iriguchi.mp3",
  "入る.mp3": "hairu.mp3",
  "入れる.mp3": "ireru.mp3",

  "全部.mp3": "zenbu.mp3",

  "八.mp3": "hachi.mp3",
  "八つ.mp3": "yattsu.mp3",
  "八百屋.mp3": "yaoya.mp3",

  "公園.mp3": "kouen.mp3",

  "六.mp3": "roku.mp3",
  "六つ.mp3": "muttsu.mp3",

  "再来年.mp3": "sarainen.mp3",

  "写真.mp3": "shashin.mp3",
  "冬.mp3": "fuyu.mp3",

  "冷たい.mp3": "tsumetai.mp3",
  "冷蔵庫.mp3": "reizouko.mp3",

  "出かける.mp3": "dekakeru.mp3",
  "出す.mp3": "dasu.mp3",
  "出る.mp3": "deru.mp3",
})
RENAME_MAP.update({
  "出口.mp3": "deguchi.mp3",
  "切る.mp3": "kiru.mp3",
  "切手.mp3": "kitte.mp3",
  "切符.mp3": "kippu.mp3",

  "初めて.mp3": "hajimete.mp3",
  "前.mp3": "mae.mp3",

  "勉強.mp3": "benkyou.mp3",
  "動物.mp3": "doubutsu.mp3",
  "勤める.mp3": "tsutomeru.mp3",

  "北.mp3": "kita.mp3",
  "医者.mp3": "isha.mp3",

  "十.mp3": "juu.mp3",
  "千.mp3": "sen.mp3",

  "午前.mp3": "gozen.mp3",
  "午後.mp3": "gogo.mp3",
  "半分.mp3": "hanbun.mp3",

  "南.mp3": "minami.mp3",
  "危ない.mp3": "abunai.mp3",
  "卵.mp3": "tamago.mp3",
  "厚い.mp3": "atsui.mp3",
  "去年.mp3": "kyonen.mp3",
  "友達.mp3": "tomodachi.mp3",
  "取る.mp3": "toru.mp3",
  "口.mp3": "kuchi.mp3",
  "古い.mp3": "furui.mp3",
  "台所.mp3": "daidokoro.mp3",
  "右.mp3": "migi.mp3",
  "同じ.mp3": "onaji.mp3",
  "名前.mp3": "namae.mp3",
  "向こう.mp3": "mukou.mp3",
  "吸う.mp3": "suu.mp3",
  "吹く.mp3": "fuku.mp3",
  "呼ぶ.mp3": "yobu.mp3",
  "咲く.mp3": "saku.mp3",
  "問題.mp3": "mondai.mp3",
  "喫茶店.mp3": "kissaten.mp3",

  "四.mp3": "yon.mp3",
  "四2.mp3": "shi_2.mp3",
  "四つ.mp3": "yottsu.mp3",

  "困る.mp3": "komaru.mp3",
  "図書館.mp3": "toshokan.mp3",
  "国.mp3": "kuni.mp3",
  "土曜日.mp3": "doyoubi.mp3",
  "地下鉄.mp3": "chikatetsu.mp3",
  "地図.mp3": "chizu.mp3",
  "塩.mp3": "shio.mp3",
  "声.mp3": "koe.mp3",
  "売る.mp3": "uru.mp3",
  "夏.mp3": "natsu.mp3",
  "夏休み.mp3": "natsuyasumi.mp3",
  "夕方.mp3": "yuugata.mp3",
  "夕飯.mp3": "yuuhan.mp3",
  "外.mp3": "soto.mp3",
  "外国.mp3": "gaikoku.mp3",
  "外国人.mp3": "gaikokujin.mp3",
  "多い.mp3": "ooi.mp3",
  "多分.mp3": "tabun.mp3",
  "夜.mp3": "yoru.mp3",
  "大きい.mp3": "ookii.mp3",
  "大きな.mp3": "ookina.mp3",
  "大丈夫.mp3": "daijoubu.mp3",
  "大人.mp3": "otona.mp3",
})
RENAME_MAP.update({
  "大使館.mp3": "taishikan.mp3",
  "大切.mp3": "taisetsu.mp3",
  "大勢.mp3": "oozei.mp3",
  "大変.mp3": "taihen.mp3",
  "大好き.mp3": "daisuki.mp3",
  "大学.mp3": "daigaku.mp3",

  "天気.mp3": "tenki.mp3",
  "太い.mp3": "futoi.mp3",

  "奥さん.mp3": "okusan.mp3",
  "女.mp3": "onna.mp3",
  "女の子.mp3": "onnanoko.mp3",

  "好き.mp3": "suki.mp3",
  "妹.mp3": "imouto.mp3",
  "姉.mp3": "ane.mp3",

  "始まる.mp3": "hajimaru.mp3",
  "始め.mp3": "hajime.mp3",

  "嫌.mp3": "iya.mp3",
  "嫌い.mp3": "kirai.mp3",

  "子供.mp3": "kodomo.mp3",
  "字引.mp3": "jibiki.mp3",

  "学校.mp3": "gakkou.mp3",
  "学生.mp3": "gakusei.mp3",

  "安い.mp3": "yasui.mp3",
  "家.mp3": "ie.mp3",
  "家庭.mp3": "katei.mp3",
  "家族.mp3": "kazoku.mp3",
  "宿題.mp3": "shukudai.mp3",

  "寒い.mp3": "samui.mp3",
  "寝る.mp3": "neru.mp3",
  "封筒.mp3": "fuutou.mp3",

  "小さい.mp3": "chiisai.mp3",
  "小さな.mp3": "chiisana.mp3",
  "少し.mp3": "sukoshi.mp3",
  "少ない.mp3": "sukunai.mp3",

  "山.mp3": "yama.mp3",
  "川.mp3": "kawa.mp3",
  "左.mp3": "hidari.mp3",
  "差す.mp3": "sasu.mp3",
  "帰る.mp3": "kaeru.mp3",
  "帽子.mp3": "boushi.mp3",
  "年.mp3": "toshi.mp3",
  "広い.mp3": "hiroi.mp3",
  "店.mp3": "mise.mp3",
  "座る.mp3": "suwaru.mp3",
  "庭.mp3": "niwa.mp3",
  "廊下.mp3": "rouka.mp3",
  "建物.mp3": "tatemono.mp3",
  "引く.mp3": "hiku.mp3",
  "弟.mp3": "otouto.mp3",
  "弱い.mp3": "yowai.mp3",
  "張る.mp3": "haru.mp3",
  "強い.mp3": "tsuyoi.mp3",
  "弾く.mp3": "hiku_2.mp3",

  "待つ.mp3": "matsu.mp3",
  "後.mp3": "ato.mp3",
  "後ろ.mp3": "ushiro.mp3",
  "忘れる.mp3": "wasureru.mp3",
  "忙しい.mp3": "isogashii.mp3",
  "悪い.mp3": "warui.mp3",
  "意味.mp3": "imi.mp3",
  "成る.mp3": "naru.mp3",
  "戸.mp3": "to.mp3",
  "所.mp3": "tokoro.mp3",
  "手.mp3": "te.mp3",
  "手紙.mp3": "tegami.mp3",
  "押す.mp3": "osu.mp3",
  "持つ.mp3": "motsu.mp3",
  "掃除.mp3": "souji.mp3",
  "授業.mp3": "jugyou.mp3",
  "撮る.mp3": "toru.mp3",
  "教える.mp3": "oshieru.mp3",
  "教室.mp3": "kyoushitsu.mp3",
  "散歩.mp3": "sanpo.mp3",
  "文章.mp3": "bunshou.mp3",
  "料理.mp3": "ryouri.mp3",
  "新しい.mp3": "atarashii.mp3",
  "新聞.mp3": "shinbun.mp3",

  "方.mp3": "kata.mp3",
  "方2.mp3": "hou_2.mp3",

  "旅行.mp3": "ryokou.mp3",
  "日曜日.mp3": "nichiyoubi.mp3",
  "早い.mp3": "hayai.mp3",
})
RENAME_MAP.update({
  "明るい.mp3": "akarui.mp3",
  "明後日.mp3": "asatte.mp3",
  "明日.mp3": "ashita.mp3",
  "映画.mp3": "eiga.mp3",
  "映画館.mp3": "eigakan.mp3",
  "春.mp3": "haru.mp3",
  "昨夜.mp3": "sakuya.mp3",
  "昨日.mp3": "kinou.mp3",
  "昼.mp3": "hiru.mp3",
  "昼ごはん.mp3": "hirugohan.mp3",
  "時々.mp3": "tokidoki.mp3",
  "時計.mp3": "tokei.mp3",
  "時間.mp3": "jikan.mp3",
  "晩.mp3": "ban.mp3",
  "晩ごはん.mp3": "bangohan.mp3",
  "晴れ.mp3": "hare.mp3",
  "晴れる.mp3": "hareru.mp3",
  "暇.mp3": "hima.mp3",
  "暑い.mp3": "atsui.mp3",
  "暖かい.mp3": "atatakai.mp3",
  "暗い.mp3": "kurai.mp3",
  "曇り.mp3": "kumori.mp3",
  "曇る.mp3": "kumoru.mp3",
  "曲がる.mp3": "magaru.mp3",
  "書く.mp3": "kaku.mp3",
  "月曜日.mp3": "getsuyoubi.mp3",
  "有名.mp3": "yuumei.mp3",
  "服.mp3": "fuku.mp3",
  "朝.mp3": "asa.mp3",
  "朝ごはん.mp3": "asagohan.mp3",
  "木.mp3": "ki.mp3",
  "木曜日.mp3": "mokuyoubi.mp3",
  "本.mp3": "hon.mp3",
  "本当.mp3": "hontou.mp3",
  "本棚.mp3": "hondana.mp3",
  "机.mp3": "tsukue.mp3",
  "村.mp3": "mura.mp3",
  "来る.mp3": "kuru.mp3",
  "来年.mp3": "rainen.mp3",
  "来月.mp3": "raigetsu.mp3",
  "来週.mp3": "raishuu.mp3",
  "東.mp3": "higashi.mp3",
  "果物.mp3": "kudamono.mp3",
  "椅子.mp3": "isu.mp3",
  "楽しい.mp3": "tanoshii.mp3",
  "横.mp3": "yoko.mp3",
  "橋.mp3": "hashi.mp3",
  "次.mp3": "tsugi.mp3",
  "欲しい.mp3": "hoshii.mp3",
  "歌.mp3": "uta.mp3",
  "歌う.mp3": "utau.mp3",
  "止まる.mp3": "tomaru.mp3",
  "歩く.mp3": "aruku.mp3",
  "歯.mp3": "ha.mp3",
  "死ぬ.mp3": "shinu.mp3",
  "毎年.mp3": "maitoshi.mp3",
  "毎日.mp3": "mainichi.mp3",
  "毎晩.mp3": "maiban.mp3",
  "毎月.mp3": "maitsuki.mp3",
  "毎週.mp3": "maishuu.mp3",
  "水.mp3": "mizu.mp3",
  "水曜日.mp3": "suiyoubi.mp3",
  "汚い.mp3": "kitanai.mp3",
  "池.mp3": "ike.mp3",
  "泳ぐ.mp3": "oyogu.mp3",
  "洋服.mp3": "youfuku.mp3",
  "洗う.mp3": "arau.mp3",
  "洗濯.mp3": "sentaku.mp3",
  "浴びる.mp3": "abiru.mp3",
  "海.mp3": "umi.mp3",
  "消える.mp3": "kieru.mp3",
  "消す.mp3": "kesu.mp3",
  "涼しい.mp3": "suzushii.mp3",
  "渡す.mp3": "watasu.mp3",
  "渡る.mp3": "wataru.mp3",
  "温い.mp3": "nurui.mp3",
  "漢字.mp3": "kanji.mp3",
  "火曜日.mp3": "kayoubi.mp3",
  "灰皿.mp3": "haizara.mp3",
  "熱い.mp3": "atsui_2.mp3",
  "牛乳.mp3": "gyuunyuu.mp3",
  "牛肉.mp3": "gyuuniku.mp3",
  "物.mp3": "mono.mp3",
  "犬.mp3": "inu.mp3",
  "狭い.mp3": "semai.mp3",
  "猫.mp3": "neko.mp3",
  "玄関.mp3": "genkan.mp3",
  "甘い.mp3": "amai.mp3",
})
RENAME_MAP.update({
  "生まれる.mp3": "umareru.mp3",
  "生徒.mp3": "seito.mp3",
  "男.mp3": "otoko.mp3",
  "男の子.mp3": "otokonoko.mp3",
  "町.mp3": "machi.mp3",
  "留学生.mp3": "ryuugakusei.mp3",
  "番号.mp3": "bangou.mp3",
  "疲れる.mp3": "tsukareru.mp3",
  "病気.mp3": "byouki.mp3",
  "病院.mp3": "byouin.mp3",
  "痛い.mp3": "itai.mp3",
  "白.mp3": "shiro.mp3",
  "白い.mp3": "shiroi.mp3",
  "百.mp3": "hyaku.mp3",
  "皆.mp3": "minna_2.mp3",
  "皆さん.mp3": "minasan.mp3",
  "目.mp3": "me.mp3",
  "着く.mp3": "tsuku.mp3",
  "着る.mp3": "kiru_2.mp3",
  "知る.mp3": "shiru.mp3",
  "短い.mp3": "mijikai.mp3",
  "石鹸.mp3": "sekken.mp3",
  "砂糖.mp3": "satou.mp3",
  "磨く.mp3": "migaku.mp3",
  "私.mp3": "watashi.mp3",
  "秋.mp3": "aki.mp3",
  "空.mp3": "sora.mp3",
  "窓.mp3": "mado.mp3",
  "立つ.mp3": "tatsu.mp3",
  "立派な.mp3": "rippana.mp3",
  "答える.mp3": "kotaeru.mp3",
  "箱.mp3": "hako.mp3",
  "箸.mp3": "hashi_2.mp3",
  "紅茶.mp3": "koucha.mp3",
  "紙.mp3": "kami.mp3",
  "細い.mp3": "hosoi.mp3",
  "終わる.mp3": "owaru.mp3",
  "結婚.mp3": "kekkon.mp3",
  "結構.mp3": "kekkou.mp3",
  "絵.mp3": "e.mp3",
  "緑.mp3": "midori.mp3",
  "締める.mp3": "shimeru.mp3",
  "練習.mp3": "renshuu.mp3",
  "縦.mp3": "tate.mp3",
  "置く.mp3": "oku.mp3",
  "習う.mp3": "narau.mp3",
  "耳.mp3": "mimi.mp3",
  "聞く.mp3": "kiku.mp3",
  "肉.mp3": "niku.mp3",
  "背.mp3": "se.mp3",
  "背広.mp3": "sebiro.mp3",
  "脱ぐ.mp3": "nugu.mp3",
  "自分.mp3": "jibun.mp3",
  "自動車.mp3": "jidousha.mp3",
  "自転車.mp3": "jitensha.mp3",
  "良い.mp3": "yoi.mp3",
  "色.mp3": "iro.mp3",
  "花.mp3": "hana.mp3",
  "花瓶.mp3": "kabin.mp3",
  "若い.mp3": "wakai.mp3",
  "英語.mp3": "eigo.mp3",
  "茶碗.mp3": "chawan.mp3",
  "茶色.mp3": "chairo.mp3",
  "荷物.mp3": "nimotsu.mp3",
  "蕎麦.mp3": "soba_2.mp3",
  "薄い.mp3": "usui.mp3",
  "薬.mp3": "kusuri.mp3",
  "行く.mp3": "iku.mp3",
  "西.mp3": "nishi.mp3",
  "見せる.mp3": "miseru.mp3",
  "見る.mp3": "miru.mp3",
  "覚える.mp3": "oboeru.mp3",
  "角.mp3": "kado.mp3",
  "角2.mp3": "tsuno_2.mp3",
  "言う.mp3": "iu.mp3",
  "言葉.mp3": "kotoba.mp3",
  "話.mp3": "hanashi.mp3",
  "話す.mp3": "hanasu.mp3",
  "誕生日.mp3": "tanjoubi.mp3",
  "読む.mp3": "yomu.mp3",
  "誰.mp3": "dare.mp3",
  "警官.mp3": "keikan.mp3",
  "豚肉.mp3": "butaniku.mp3",
  "財布.mp3": "saifu.mp3",
  "買い物.mp3": "kaimono.mp3",
  "買う.mp3": "kau.mp3",
  "貸す.mp3": "kasu.mp3",
  "賑やか.mp3": "nigiyaka.mp3",
  "質問.mp3": "shitsumon.mp3",
  "赤.mp3": "aka.mp3",
  "赤い.mp3": "akai.mp3",
  "走る.mp3": "hashiru.mp3",
  "起きる.mp3": "okiru.mp3",
  "足.mp3": "ashi.mp3",
  "車.mp3": "kuruma.mp3",
  "軽い.mp3": "karui.mp3",
  "辛い.mp3": "tsurai.mp3",
  "辞書.mp3": "jisho.mp3",
  "辺.mp3": "hen.mp3",
  "近い.mp3": "chikai.mp3",
  "近く.mp3": "chikaku.mp3",
  "返す.mp3": "kaesu.mp3",
  "速い.mp3": "hayai_2.mp3",
  "遅い.mp3": "osoi.mp3",
  "遊ぶ.mp3": "asobu.mp3",
  "道.mp3": "michi.mp3",
  "違う.mp3": "chigau.mp3",
  "遠い.mp3": "tooi.mp3",
  "部屋.mp3": "heya.mp3",
  "郵便局.mp3": "yuubinkyoku.mp3",
  "醤油.mp3": "shouyu.mp3",
  "重い.mp3": "omoi.mp3",
  "野菜.mp3": "yasai.mp3",
  "金曜日.mp3": "kinyoubi.mp3",
  "鉛筆.mp3": "enpitsu.mp3",
  "銀行.mp3": "ginkou.mp3",
  "鍵.mp3": "kagi.mp3",
  "長い.mp3": "nagai.mp3",
  "門.mp3": "mon.mp3",
  "閉まる.mp3": "shimaru.mp3",
  "閉める.mp3": "shimeru_2.mp3",
  "開く.mp3": "hiraku.mp3",
  "開く2.mp3": "aku_2.mp3",
  "開ける.mp3": "akeru.mp3",
  "降りる.mp3": "oriru.mp3",
  "降る.mp3": "furu.mp3",
  "階段.mp3": "kaidan.mp3",
  "隣.mp3": "tonari.mp3",
  "雑誌.mp3": "zasshi.mp3",
  "難しい.mp3": "muzukashii.mp3",
})
RENAME_MAP.update({
  "雨.mp3": "ame.mp3",
  "雪.mp3": "yuki.mp3",
  "零.mp3": "rei.mp3",

  "電気.mp3": "denki.mp3",
  "電話.mp3": "denwa.mp3",
  "電車.mp3": "densha.mp3",

  "青.mp3": "ao.mp3",
  "青い.mp3": "aoi.mp3",

  "静か.mp3": "shizuka.mp3",
  "面白い.mp3": "omoshiroi.mp3",

  "靴.mp3": "kutsu.mp3",
  "靴下.mp3": "kutsushita.mp3",
  "鞄.mp3": "kaban.mp3",

  "音楽.mp3": "ongaku.mp3",
  "頭.mp3": "atama.mp3",
  "頼む.mp3": "tanomu.mp3",

  "風.mp3": "kaze.mp3",
  "風呂.mp3": "furo.mp3",
  "風邪.mp3": "kaze_2.mp3",

  "飛ぶ.mp3": "tobu.mp3",
  "飛行機.mp3": "hikouki.mp3",

  "食べる.mp3": "taberu.mp3",
  "食べ物.mp3": "tabemono.mp3",
  "食堂.mp3": "shokudou.mp3",

  "飲み物.mp3": "nomimono.mp3",
  "飲む.mp3": "nomu.mp3",
  "飴.mp3": "ame_2.mp3",

  "駅.mp3": "eki.mp3",
  "高い.mp3": "takai.mp3",
  "魚.mp3": "sakana.mp3",
  "鳥.mp3": "tori.mp3",
  "鳴く.mp3": "naku.mp3",

  "黄色.mp3": "kiiro.mp3",
  "黄色い.mp3": "kiiroi.mp3",

  "黒.mp3": "kuro.mp3",
  "黒い.mp3": "kuroi.mp3",

  "鼻.mp3": "hana_2.mp3",

  "１か月.mp3": "ikkagetsu.mp3",
  "１日.mp3": "tsuitachi.mp3",
  "１月.mp3": "ichigatsu.mp3",
  "１０日.mp3": "tooka.mp3",
  "２日.mp3": "futsuka.mp3",
  "２０日.mp3": "hatsuka.mp3",
  "２０歳.mp3": "hatachi.mp3",
  "３日.mp3": "mikka.mp3",
  "４日.mp3": "yokka.mp3",
  "５日.mp3": "itsuka.mp3",
  "６日.mp3": "muika.mp3",
  "７日.mp3": "nanoka.mp3",
  "８日.mp3": "youka.mp3",
  "９日.mp3": "kokonoka.mp3",

  "ＰＥＴ.mp3": "pet.mp3",
})

# Si tienes archivos como "七2.mp3" y quieres normalizar:
# "七2.mp3": "nana_2.mp3",  # ejemplo

def apply_rename(folder: Path, apply: bool) -> None:
    import uuid

    folder = folder.resolve()
    if not folder.exists() or not folder.is_dir():
        raise SystemExit(f"❌ Carpeta inválida: {folder}")

    # 1) Recolectar renombres aplicables (solo los que existen)
    pairs = []
    for old_name, desired_name in RENAME_MAP.items():
        old_path = folder / old_name
        if old_path.exists():
            pairs.append((old_path, desired_name))

    if not pairs:
        print("ℹ No hay archivos que renombrar.")
        return

    # 2) Resolver destinos únicos (incluye colisiones dentro del mismo lote)
    existing_names = {p.name for p in folder.iterdir() if p.is_file()}
    reserved = set(existing_names)  # nombres ya ocupados

    plan = []  # (old_path, final_path)
    for old_path, desired_name in pairs:
        base = Path(desired_name).stem
        suffix = Path(desired_name).suffix or old_path.suffix

        # Si el destino es el mismo nombre, no hacemos nada
        if old_path.name == desired_name:
            continue

        candidate = f"{base}{suffix}"
        k = 2
        while candidate in reserved:
            candidate = f"{base}_{k}{suffix}"
            k += 1

        final_path = folder / candidate
        reserved.add(candidate)
        plan.append((old_path, final_path))

    if not plan:
        print("ℹ Nada por renombrar (ya estaban con el nombre destino).")
        return

    print("\n📋 PLAN DE RENOMBRADO:")
    for old_path, final_path in plan:
        print(f"  {old_path.name} → {final_path.name}")

    if not apply:
        print("\n✅ DRY RUN: nada fue cambiado. Usa --apply para ejecutar.")
        return

    # 3) Renombrado en 2 fases (temporal único -> final) para evitar sobrescribir
    tmp_moves = []   # (old_path, tmp_path)
    final_moves = [] # (tmp_path, final_path)

    try:
        for old_path, final_path in plan:
            tmp_name = f"__TMP__{uuid.uuid4().hex}__{old_path.name}"
            tmp_path = folder / tmp_name
            old_path.rename(tmp_path)
            tmp_moves.append((old_path, tmp_path))
            final_moves.append((tmp_path, final_path))

        for tmp_path, final_path in final_moves:
            tmp_path.rename(final_path)

        print("\n✨ Renombrado completado sin conflictos.")

    except Exception as e:
        print("\n❌ ERROR durante renombrado. Intentando revertir temporales...")
        # revertir temporales que queden
        for old_path, tmp_path in reversed(tmp_moves):
            try:
                if tmp_path.exists() and not old_path.exists():
                    tmp_path.rename(old_path)
            except Exception:
                pass
        raise

def update_json_paths(json_path: Path, apply: bool) -> None:
    json_path = json_path.resolve()
    if not json_path.exists() or not json_path.is_file():
        raise SystemExit(f"❌ JSON inválido: {json_path}")

    # Creamos un mapa por "basename": viejo.mp3 → nuevo.mp3
    # (solo reemplazamos strings que terminen en el viejo basename)
    base_map = dict(RENAME_MAP)

    data = json.loads(json_path.read_text(encoding="utf-8"))

    def walk(x: Any) -> Any:
        if isinstance(x, dict):
            return {k: walk(v) for k, v in x.items()}
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, str):
            # Reemplazo si contiene / termina con el viejo nombre
            for old_base, new_base in base_map.items():
                if x == old_base:
                    return new_base
                if x.endswith("/" + old_base):
                    return x[:-len(old_base)] + new_base
            return x
        return x

    new_data = walk(data)

    if not apply:
        print("✅ DRY RUN JSON: listo para escribir (no se guardó). Usa --apply para guardar.")
        return

    # Backup
    backup = json_path.with_suffix(json_path.suffix + ".bak")
    backup.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    json_path.write_text(json.dumps(new_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✨ JSON actualizado: {json_path}")
    print(f"🧯 Backup: {backup}")

def main():
    ap = argparse.ArgumentParser(description="Renombra mp3 con tabla y (opcional) actualiza JSON")
    ap.add_argument("folder", help="Carpeta donde están los mp3 a renombrar")
    ap.add_argument("--json", dest="json_file", default="", help="Ruta a JSON para actualizar referencias .mp3")
    ap.add_argument("--apply", action="store_true", help="Ejecuta cambios reales (por defecto es simulación)")
    args = ap.parse_args()

    folder = Path(args.folder)
    apply_rename(folder, args.apply)

    if args.json_file.strip():
        update_json_paths(Path(args.json_file), args.apply)

if __name__ == "__main__":
    main()
