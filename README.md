# BLOOD OATH II

> **The moon is broken. The oath remains. Enter the arena.**

Blood Oath II, tarayıcıda anında çalışan özgün bir 2D karanlık fantezi arcade dövüş oyunudur. Kurulum, indirme veya ROM gerekmez: sayfayı aç, dövüşçünü seç ve başla.

## Oyunu aç

**[GitHub Pages üzerinde oyna →](https://thekhaggard.github.io/mk2-arcade-player/)**

## Özellikler

- Tek oyuncu: bilgisayar kontrollü rakibe karşı
- Yerel versus: aynı klavyede iki oyuncu
- İki oyun kolu desteği (Gamepad API)
- İki özgün dövüşçü: Riven ve Veyra
- En iyi üç raunt sistemi, zamanlayıcı, blok, dört saldırı ve nakavt
- Web Audio ile üretilen özgün arcade sesleri
- Tam ekran ve duyarlı arcade kabini arayüzü
- Saf HTML, CSS ve JavaScript; harici çalışma zamanı bağımlılığı yok

## Kontroller

|                   | Oyuncu 1          | Oyuncu 2             | Oyun kolu             |
|-------------------|-------------------|----------------------|-----------------------|
| Hareket           | `W` `A` `S` `D` | Yön tuşları          | Sol analog / D-pad    |
| Yüksek yumruk     | `F`               | `J`                  | Yüz düğmesi           |
| Alçak yumruk      | `V`               | `M`                  | Yüz düğmesi           |
| Blok              | `G`               | `K`                  | Sol omuz              |
| Yüksek tekme      | `H`               | `L`                  | Yüz düğmesi           |
| Alçak tekme       | `N`               | `.`                  | Yüz düğmesi           |
| Duraklat          | `P` / `Esc`       | `P` / `Esc`          | Start                 |

## Yerelde çalıştırma

ES modülleri nedeniyle projeyi küçük bir HTTP sunucusuyla aç:

```bash
python3 -m http.server 8080
```

Ardından `http://localhost:8080` adresine git.

## Geliştirme

Statik kontrolleri çalıştırmak için:

```bash
python3 -m unittest discover -s tests -v
```

`main` dalına gönderilen her commit, GitHub Actions testlerinden geçtikten sonra GitHub Pages'a otomatik dağıtılır.

## Yasal not

Blood Oath II; karakterleri, dünyası, kodu ve görselleriyle özgün bir bağımsız projedir. Mortal Kombat veya başka bir oyun serisiyle bağlantılı değildir ve bunlara ait ROM, sprite, ses, logo ya da oyun verisi içermez.

Kod [MIT Lisansı](LICENSE) ile sunulur. Görsel varlıklar için [üçüncü taraf ve varlık notlarına](THIRD_PARTY_NOTICES.md) bakabilirsin.
