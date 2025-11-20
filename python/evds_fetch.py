#!/usr/bin/env python3
"""
Basit EVDS veri çekme script'i.
evds paketini kullanarak verilen seri kodlarını ve tarih aralığını sorgular,
sonucu JSON olarak stdout'a basar.

Kullanım:
  source .venv/bin/activate
  python python/evds_fetch.py \
    --series TP.DK.USD.A.YTL TP.DK.EUR.A.YTL \
    --start-date 01-01-2019 \
    --end-date 01-01-2020
"""

import argparse
import json
import os
from evds import evdsAPI

DEFAULT_API_KEY = os.getenv("EVDS_API_KEY", "LHfpB2AyPN")


def parse_args():
  parser = argparse.ArgumentParser(description="EVDS veri çekme aracı")
  parser.add_argument(
      "--series",
      nargs="+",
      required=True,
      help="EVDS seri kodları (boşlukla ayrılmış)"
  )
  parser.add_argument(
      "--start-date",
      required=True,
      help="Başlangıç tarihi (DD-MM-YYYY)"
  )
  parser.add_argument(
      "--end-date",
      help="Bitiş tarihi (DD-MM-YYYY). Boş bırakılırsa start-date kullanılır."
  )
  parser.add_argument(
      "--api-key",
      default=DEFAULT_API_KEY,
      help="EVDS API anahtarı (varsayılan: EVDS_API_KEY env ya da LHfpB2AyPN)"
  )
  parser.add_argument(
      "--output",
      help="Sonucu kaydetmek için JSON dosya yolu. Boşsa stdout'a yazılır."
  )
  return parser.parse_args()


def main():
  args = parse_args()
  start_date = args.start_date
  end_date = args.end_date or args.start_date

  client = evdsAPI(args.api_key)
  df = client.get_data(args.series, startdate=start_date, enddate=end_date)

  result = {
      "series": args.series,
      "startDate": start_date,
      "endDate": end_date,
      "rows": json.loads(df.to_json(orient="records"))
  }

  if args.output:
    with open(args.output, "w", encoding="utf-8") as f:
      json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Veri {args.output} dosyasına kaydedildi.")
  else:
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
  main()

