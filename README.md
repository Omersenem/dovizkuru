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

## Production Deployment

### Backend Deployment (Render)

GitHub Pages sadece statik dosyaları barındırabilir, Python backend çalıştıramaz. Bu yüzden backend'i ayrı bir servise deploy etmeniz gerekir.

**Render.com'da Backend Deploy:**

1. [Render.com](https://render.com)'a kaydolun ve GitHub repo'nuzu bağlayın
2. Yeni bir "Web Service" oluşturun
3. Ayarlar:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn api:app`
   - **Environment Variables**:
     - `EVDS_API_KEY`: TCMB EVDS API anahtarınız
     - `ALLOWED_ORIGINS`: `https://omersenem.github.io` (GitHub Pages URL'iniz)
   - **Python Version**: 3.11.9 (veya uyumlu bir versiyon)
4. Deploy butonuna tıklayın
5. Backend URL'inizi not edin: `https://your-app-name.onrender.com`

**Backend URL'ini Frontend'de Kullanma:**

Frontend build'inde backend URL'ini kullanmak için:

```bash
# Production build sırasında environment variable'ı set edin
VITE_API_URL=https://your-app-name.onrender.com/api/tcmb npm run build
```

Veya `.env.production` dosyası oluşturun (`.gitignore`'da olmalı):
```
VITE_API_URL=https://your-app-name.onrender.com/api/tcmb
```

Sonra build yapın:
```bash
npm run build
```

### Frontend Deployment (GitHub Pages)

Projede GitHub Pages için "Docs" seçeneği kullanılıyor. `vite.config.js` içerisinde:
- `build.outDir = 'docs'` → dağıtım dosyalarını `docs/` klasörüne üretir.
- `base = '/dovizkuru/'` → GitHub Pages alt yolunda asset yollarını düzeltir.

**Deployment Adımları:**

1. Backend'i Render'a deploy edin (yukarıdaki adımlar)
2. Backend URL'ini not edin
3. Production build yapın (backend URL ile):
```bash
VITE_API_URL=https://your-app-name.onrender.com/api/tcmb npm run build
```
4. Build'i GitHub'a push edin:
```bash
git add docs
git commit -m "chore: publish new build with backend URL"
git push origin main
```
5. GitHub repo settings'den Pages'i aktif edin ve `docs/` klasörünü seçin

**Not:** Render ücretsiz planında uygulama 15 dakika kullanılmazsa uyku moduna geçer. İlk istek biraz yavaş olabilir.

## Yardımcı Komutlar
- `npm run lint` → ESLint kontrolleri
- `npm run build` → üretim paketi (docs/)
- `python api.py` → backend proxy

## Notlar
- Repo adını değiştirirsen `vite.config.js` içindeki `base` değerini yeni repo ismine göre güncelle.
- EVDS API limitleri nedeniyle uzun tarih aralıklarında yanıt gecikmeleri olabilir; bu durumlarda servis katmanı sonuçları önbelleğe alacak şekilde genişletilebilir.
