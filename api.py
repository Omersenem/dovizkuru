from flask import Flask, request, jsonify
from flask_cors import CORS
from evds import evdsAPI
from dotenv import load_dotenv
import os
import sys

# EVDS Paketini kullanmak için
# pip install flask flask-cors evds

load_dotenv()

app = Flask(__name__)
CORS(app)  # Tüm originlere izin ver (Development için)

# API Key
API_KEY = os.getenv("EVDS_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "EVDS_API_KEY ortama yüklenmedi. Lütfen proje köküne .env dosyası oluşturup "
        "EVDS_API_KEY=your_key formatında değer girin."
    )

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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'backend': 'python-flask'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)

