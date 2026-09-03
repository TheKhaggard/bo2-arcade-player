# Mortal Kombat II — Local Arcade Player

1993 arcade sürümünü kullanıcının kendi yasal ROM arşivinden çalıştıran, iki
oyunculu tarayıcı arayüzü. Proje oyun verisi içermez ve ROM'u hiçbir sunucuya
yüklemez.

> [!IMPORTANT]
> Bu depo Mortal Kombat II ROM'u, sprite'ları, sesleri, müzikleri veya diğer
> telifli oyun varlıklarını içermez. ROM istemeyin, paylaşmayın veya repoya
> commit etmeyin.

## Özellikler

- MAME 2003-Plus tabanlı 1993 arcade emülasyonu
- Aynı klavyede iki oyuncu
- İki gamepad desteği ve oyun içinden yeniden eşleme
- Sürükle-bırak `mk2.zip` seçimi
- ZIP imzası, boyut ve yerel SHA-256 parmak izi kontrolü
- Mobil uyumlu retro arcade arayüzü
- GitHub Actions ile otomatik GitHub Pages dağıtımı
- Bağımlılıksız statik frontend

## Yerelde çalıştırma

Python 3 bulunan proje klasöründe:

```bash
python3 -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın. Siteyi doğrudan `file://`
üzerinden açmak tarayıcı güvenlik politikaları nedeniyle desteklenmez.

1. Yasal olarak sahip olduğunuz, MAME 2003-Plus ile uyumlu `mk2.zip` arşivini seçin.
2. **Arcade'i Başlat** düğmesine basın.
3. İki kişilik oyun için iki jeton ekleyin ve P2 başlat tuşuna basın.

EmulatorJS çekirdeği ilk açılışta resmi CDN üzerinden indirilir. ROM için
herhangi bir uzaktaki URL kullanılmaz; tarayıcının oluşturduğu geçici yerel
`blob:` adresi kullanılır.

## Varsayılan kontroller

| İşlem | Oyuncu 1 | Oyuncu 2 |
|---|---:|---:|
| Yönler | `W` `A` `S` `D` | Ok tuşları |
| High Punch | `F` | `J` |
| Low Punch | `V` | `M` |
| Block | `G` | `K` |
| High Kick | `H` | `L` |
| Low Kick | `N` | `.` |
| Jeton | `5` | `6` |
| Başlat | `1` | `2` |

Gamepad düğmeleri tarayıcı ve kontrolcü modeline göre farklı görünebilir.
Emülatör araç çubuğundaki kontrol ayarından P1–P4 eşlemeleri değiştirilebilir.

## Test

```bash
python3 -m unittest discover -s tests -v
```

Testler zorunlu dosyaları, emülatör sürüm sabitlemesini ve repoda ROM/disk
dosyası bulunmadığını denetler.

## GitHub Pages

`.github/workflows/pages.yml`, `main` dalına her push işleminde testleri çalıştırır
ve siteyi Pages ortamına gönderir. GitHub deposunda **Settings → Pages → Source**
alanını **GitHub Actions** olarak seçmek yeterlidir.

## Lisans ve markalar

Bu depodaki özgün arayüz kodu [MIT Lisansı](LICENSE) ile sunulur. Emülatör
bileşenleri ayrı lisanslara tabidir; ayrıntılar için
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) dosyasına bakın.

Mortal Kombat II ve ilgili adlar/markalar kendi hak sahiplerine aittir. Bu proje
Midway, Warner Bros. Discovery veya bağlı şirketlerce desteklenmez.
