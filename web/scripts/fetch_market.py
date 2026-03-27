import sys
import json
import yfinance as yf
import pandas as pd

def fetch_data(symbol, period="6mo", interval="1d"):
    try:
        df = yf.download(symbol, period=period, interval=interval, progress=False)
        if df.empty:
            print(json.dumps({"error": "No data found"}))
            sys.exit(1)

        df.reset_index(inplace=True)

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        records = []
        for _, row in df.iterrows():
            date_col = row['Date'] if 'Date' in row else row['index']
            date_str = date_col.strftime('%Y-%m-%d') if hasattr(date_col, 'strftime') else str(date_col)[:10]
            records.append({
                "time": date_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": float(row.get('Volume', 0))
            })

        current_price = float(df['Close'].iloc[-1])
        prev_price = float(df['Close'].iloc[-2])
        change_pct = ((current_price - prev_price) / prev_price) * 100

        print(json.dumps({
            "historical": records,
            "currentPrice": current_price,
            "changePercent": change_pct,
            "name": symbol
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        _sym = sys.argv[1]
        _period = sys.argv[2] if len(sys.argv) > 2 else "6mo"
        _interval = sys.argv[3] if len(sys.argv) > 3 else "1d"
        fetch_data(_sym, _period, _interval)
    else:
        fetch_data("HDFCBANK.NS")
