from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from evds import evdsAPI
from dotenv import load_dotenv
import os
import sys
import requests

# EVDS Paketini kullanmak için
# pip install flask flask-cors evds

load_dotenv()

app = Flask(__name__)

# CORS ayarları: Production'da belirli originlere izin ver
allowed_origins = os.getenv('ALLOWED_ORIGINS', '*').split(',')
if allowed_origins == ['*']:
    # Development: Tüm originlere izin ver
    CORS(app)
else:
    # Production: Belirli originlere izin ver
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# API Keys
API_KEY = os.getenv("EVDS_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "EVDS_API_KEY ortama yüklenmedi. Lütfen proje köküne .env dosyası oluşturup "
        "EVDS_API_KEY=your_key formatında değer girin."
    )

GOLD_API_KEY = os.getenv("GOLD_API_KEY")
if not GOLD_API_KEY:
    print("Uyarı: GOLD_API_KEY ortama yüklenmedi. Gold API özellikleri çalışmayabilir.")

GOLD_API_BASE_URL = "https://api.gold-api.com"

@app.route('/api/tcmb', methods=['GET'])
def get_tcmb_data():
    try:
        series = request.args.get('series')
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')

        if not series or not start_date or not end_date:
            return jsonify({'error': 'series, startDate ve endDate parametreleri gerekli'}), 400

        # Seri kodlarını virgülle ayrılmış string'den listeye çevir
        # Frontend tek bir seri gönderiyorsa liste içinde tek eleman olur
        series_list = series.split(',')

        # EVDS API istemcisini başlat
        evds = evdsAPI(API_KEY)

        # Veriyi çek
        # EVDS kütüphanesi startdate/enddate parametrelerini bekliyor (lowercase date)
        # Dokümanda startdate, enddate olarak geçiyor
        print(f"İstek: Series={series_list}, Start={start_date}, End={end_date}")
        
        df = evds.get_data(series_list, startdate=start_date, enddate=end_date)
        
        # DataFrame boşsa veya hata varsa
        if df is None or df.empty:
             print("EVDS yanıtı: boş veri döndü")
             return jsonify({'items': []}), 200

        # Kolon isimlerini orijinal seri kodları ile eşleştir (nokta formatı)
        rename_map = {}
        for original in series_list:
            sanitized = original.replace('.', '_')
            if sanitized in df.columns:
                rename_map[sanitized] = original
            # Bazı serilerde EVDS otomatik olarak sonuna _YTL ekleyebilir
            elif f"{sanitized}_YTL" in df.columns:
                rename_map[f"{sanitized}_YTL"] = original
            elif sanitized.replace('-', '_') in df.columns:
                rename_map[sanitized.replace('-', '_')] = original
        if rename_map:
            df = df.rename(columns=rename_map)

        # DataFrame'i JSON formatına çevir (records tipinde: [{col: val}, ...])
        # Tarih formatını düzeltmek gerekebilir ama evds kütüphanesi genelde Tarih kolonu ile döner
        data = df.to_dict(orient='records')
        print("EVDS yanıtı:", data[:3] if len(data) > 3 else data)
        
        # Frontend'in beklediği formatta döndür
        # Frontend `response.data.items` bekliyor olabilir ya da direkt array
        # Mevcut yapıyı bozmamak için `items` içinde döndürelim
        return jsonify({'items': data})

    except Exception as e:
        detail = getattr(e, 'args', [None])[0]
        print(f"Hata: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                print("EVDS hata yanıtı:", e.response.text)
            except Exception:
                pass
        return jsonify({'error': str(e), 'detail': detail}), 500

def proxy_gold_api(path, params=None, timeout=30):
    if not GOLD_API_KEY:
        return jsonify({'error': 'GOLD_API_KEY tanımlı değil. Lütfen backend ortam değişkenini ayarlayın.'}), 500
    
    url = f"{GOLD_API_BASE_URL}{path}"
    try:
        response = requests.get(
            url,
            headers={'x-api-key': GOLD_API_KEY},
            params=params,
            timeout=timeout
        )
        return Response(
            response=response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'application/json')
        )
    except requests.exceptions.RequestException as e:
        print(f"Gold API isteği başarısız ({path}): {str(e)}")
        return jsonify({'error': 'Gold API isteği başarısız', 'detail': str(e)}), 502


@app.route('/api/gold/price/<symbol>', methods=['GET'])
def gold_price_proxy(symbol):
    return proxy_gold_api(f"/price/{symbol}", timeout=10)


@app.route('/api/gold/history', methods=['GET'])
def gold_history_proxy():
    params = {}
    for key in ['symbol', 'startTimestamp', 'endTimestamp', 'groupBy', 'aggregation', 'orderBy']:
        value = request.args.get(key)
        if value is not None:
            params[key] = value
    
    return proxy_gold_api("/history", params=params, timeout=30)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'backend': 'python-flask'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)

