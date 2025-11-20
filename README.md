# dövizkuru

TCMB EVDS verilerini kullanarak USD/EUR gibi kurların geçmiş performansını kıyaslayan, React + Vite tabanlı tek sayfa uygulaması. Frontend, Flask tabanlı küçük bir proxy üzerinden EVDS API’sine bağlanır ve sonuçları yatırım kartlarında gösterir.

## Teknolojiler
- React 18 + Vite 5 (HMR, Axios, Context tabanlı state yönetimi)
- Flask + flask-cors + evds (TCMB EVDS API proxy’si)
- Vite proxy → `/api/tcmb` endpoint’i yerel backend’e yönlendirir
- GitHub Pages (statik olarak `docs/` klasöründen yayınlanır)

## Kurulum

### Önkoşullar
- Node.js 18+
- Python 3.10+
- TCMB EVDS erişim anahtarı

### Depoyu klonla ve bağımlılıkları yükle
```bash
git clone https://github.com/Omersenem/dovizkuru.git
cd dovizkuru
npm install
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r python/requirements.txt  # yoksa: pip install flask flask-cors evds python-dotenv
```

### Ortam değişkeni
1. `env.example` dosyasını kopyala: `cp env.example .env`
2. `EVDS_API_KEY` değerini EVDS anahtarınla doldur.
3. `.env` dosyası `.gitignore` içinde olduğu için depoya push edilmez.

Backend başlatıldığında `python-dotenv` ile `.env` otomatik okunur. Anahtar tanımlı değilse uygulama başlarken hata verir.

## Çalıştırma

### Backend (Flask proxy)
```bash
source .venv/bin/activate
python api.py
```
Varsayılan port `3001`, `/api/tcmb` endpoint’i `series`, `startDate`, `endDate` parametreleriyle EVDS’den veri çeker.

### Frontend (Vite)
```bash
npm run dev
```
Vite, `/api/tcmb` çağrılarını `vite.config.js` içindeki proxy sayesinde `http://localhost:3001` adresine yönlendirir.

## Üretim Derlemesi ve GitHub Pages
Projede GitHub Pages için “Docs” seçeneği kullanılıyor. `vite.config.js` içerisinde:
- `build.outDir = 'docs'` → dağıtım dosyalarını `docs/` klasörüne üretir.
- `base = '/dovizkuru/'` → GitHub Pages alt yolunda asset yollarını düzeltir.

Yeni bir sürüm yayınlamak için:
```bash
npm run build   # docs/ klasörünü günceller
git add docs
git commit -m "chore: publish new build"
git push origin main
```
GitHub Pages workflow’u `docs/` klasörünü kaynak olarak kullanır, bu sayede Jekyll “docs klasörü yok” hatası ortadan kalkar.

## Yardımcı Komutlar
- `npm run lint` → ESLint kontrolleri
- `npm run build` → üretim paketi (docs/)
- `python api.py` → backend proxy

## Notlar
- Repo adını değiştirirsen `vite.config.js` içindeki `base` değerini yeni repo ismine göre güncelle.
- EVDS API limitleri nedeniyle uzun tarih aralıklarında yanıt gecikmeleri olabilir; bu durumlarda servis katmanı sonuçları önbelleğe alacak şekilde genişletilebilir.
