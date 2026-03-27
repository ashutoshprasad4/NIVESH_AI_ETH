import sys
import json
import yfinance as yf
import pandas as pd


def fetch_data(symbols, period="6mo", interval="1d"):
    symbol_list = [s.strip() for s in symbols.split(',')]
    results = {}

    try:
        # 🔹 Fetch data
        df = yf.download(
            symbol_list,
            period=period,
            interval=interval,
            progress=False,
            group_by='ticker',
            auto_adjust=False
        )

        if df.empty:
            print(json.dumps({"error": f"No data found for symbols: {symbols}"}))
            sys.exit(1)

        for symbol in symbol_list:
            try:
                # 🔹 Extract per-symbol dataframe
                if len(symbol_list) == 1:
                    ticker_df = df.copy()
                else:
                    if symbol not in df.columns.get_level_values(0):
                        results[symbol] = {"error": "Symbol not found in response"}
                        continue
                    ticker_df = df[symbol].copy()

                if ticker_df.empty:
                    results[symbol] = {"error": "Empty dataframe"}
                    continue

                # 🔹 Flatten columns (handles MultiIndex safely)
                if isinstance(ticker_df.columns, pd.MultiIndex):
                    ticker_df.columns = ticker_df.columns.get_level_values(-1)

                # 🔹 Ensure required columns exist
                required_cols = ['Open', 'High', 'Low', 'Close']
                if not all(col in ticker_df.columns for col in required_cols):
                    results[symbol] = {
                        "error": f"Missing OHLC columns: {list(ticker_df.columns)}"
                    }
                    continue

                # 🔹 Clean + sort
                ticker_df = ticker_df.dropna(subset=['Close']).sort_index()

                if ticker_df.empty:
                    results[symbol] = {"error": "No valid price data"}
                    continue

                # 🔹 Convert to frontend format
                records = []
                for idx, row in ticker_df.iterrows():
                    records.append({
                        "time": idx.strftime('%Y-%m-%d'),
                        "open": float(row['Open']),
                        "high": float(row['High']),
                        "low": float(row['Low']),
                        "close": float(row['Close']),
                        "volume": float(row.get('Volume', 0))
                    })

                # 🔹 Price stats
                current_price = float(ticker_df['Close'].iloc[-1])
                prev_price = float(ticker_df['Close'].iloc[-2]) if len(ticker_df) > 1 else current_price
                change_pct = ((current_price - prev_price) / prev_price) * 100 if prev_price != 0 else 0

                results[symbol] = {
                    "historical": records,
                    "currentPrice": current_price,
                    "changePercent": change_pct,
                    "name": symbol
                }

            except Exception as e:
                results[symbol] = {"error": str(e)}

        # 🔹 Return clean output
        if len(symbol_list) == 1:
            print(json.dumps(results[symbol_list[0]]))
        else:
            print(json.dumps(results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        _syms = sys.argv[1]  # "HDFCBANK.NS,RELIANCE.NS"
        _period = sys.argv[2] if len(sys.argv) > 2 else "6mo"
        _interval = sys.argv[3] if len(sys.argv) > 3 else "1d"
        fetch_data(_syms, _period, _interval)
    else:
        fetch_data("HDFCBANK.NS")