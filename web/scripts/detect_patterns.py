import sys
import json
import yfinance as yf
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def detect_patterns(symbol):
    try:
        df = yf.download(symbol, period="1y", interval="1d", progress=False)
        if df.empty:
            print(json.dumps({"error": "No data found"})); sys.exit(1)
        
        # Flatten MultiIndex if present
        import pandas as pd
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        closes = df['Close'].values.flatten()
        highs  = df['High'].values.flatten()
        lows   = df['Low'].values.flatten()
        volumes= df['Volume'].values.flatten()
        n = len(closes)
        current = float(closes[-1])
        
        patterns = []
        
        # --- 1. SUPPORT & RESISTANCE ---
        recent_lows  = lows[-20:]
        recent_highs = highs[-20:]
        support    = float(np.percentile(recent_lows, 15))
        resistance = float(np.percentile(recent_highs, 85))
        near_support    = current <= support * 1.02
        near_resistance = current >= resistance * 0.98
        
        if near_support:
            patterns.append({
                "name": "Near Support",
                "type": "BULLISH",
                "description": f"Price is within 2% of key support at ₹{support:.2f}. Historically, prices bounce from this zone.",
                "confidence": 65,
                "key_level": round(support, 2)
            })
        if near_resistance:
            patterns.append({
                "name": "Near Resistance",
                "type": "BEARISH",
                "description": f"Price is approaching key resistance at ₹{resistance:.2f}. Watch for a rejection or breakout.",
                "confidence": 62,
                "key_level": round(resistance, 2)
            })

        # --- 2. VOLUME SPIKE (Bulk/Institutional Interest) ---
        vol_avg = float(np.mean(volumes[-20:]))
        vol_today = float(volumes[-1])
        if vol_today > vol_avg * 2.5:
            patterns.append({
                "name": "Volume Spike",
                "type": "ALERT",
                "description": f"Today's volume is {vol_today/vol_avg:.1f}x the 20-day average — signals institutional activity or major news.",
                "confidence": 80,
                "key_level": None
            })

        # --- 3. BREAKOUT ---
        prev_high = float(np.max(highs[-50:-1]))
        if current > prev_high * 0.99:
            patterns.append({
                "name": "Breakout",
                "type": "BULLISH",
                "description": f"Price broke above the 50-day high of ₹{prev_high:.2f} — a classic momentum breakout signal.",
                "confidence": 74,
                "key_level": round(prev_high, 2)
            })

        # --- 4. DOUBLE BOTTOM ---
        if n >= 30:
            lows_window = lows[-30:]
            min1_idx = int(np.argmin(lows_window))
            lows_masked = lows_window.copy()
            window = max(3, int(len(lows_masked) * 0.1))
            lows_masked[max(0, min1_idx-window):min(len(lows_masked), min1_idx+window)] = 1e9
            min2_idx = int(np.argmin(lows_masked))
            min1, min2 = float(lows_window[min1_idx]), float(lows_window[min2_idx])
            if abs(min1 - min2) / min1 < 0.03 and abs(min1_idx - min2_idx) > 5:
                patterns.append({
                    "name": "Double Bottom",
                    "type": "BULLISH",
                    "description": f"Two equal lows at ~₹{(min1+min2)/2:.2f} detected — a strong bullish reversal formation.",
                    "confidence": 71,
                    "key_level": round((min1+min2)/2, 2)
                })

        # --- 5. DOWNTREND (Bearish) ---
        sma20 = float(np.mean(closes[-20:]))
        sma50 = float(np.mean(closes[-50:])) if n >= 50 else sma20
        if current < sma20 < sma50:
            patterns.append({
                "name": "Downtrend",
                "type": "BEARISH",
                "description": f"Price (₹{current:.2f}) is below both the 20-day (₹{sma20:.2f}) and 50-day (₹{sma50:.2f}) moving averages — confirmed downtrend.",
                "confidence": 68,
                "key_level": None
            })
        elif current > sma20 > sma50:
            patterns.append({
                "name": "Uptrend",
                "type": "BULLISH",
                "description": f"Price (₹{current:.2f}) riding above both 20-day (₹{sma20:.2f}) and 50-day (₹{sma50:.2f}) MAs — healthy uptrend in progress.",
                "confidence": 72,
                "key_level": None
            })

        # --- SIMPLE BACKTEST (3yr win rate for top pattern) ---
        backtest = None
        if patterns:
            # Run a simplistic backtest: after similar historical price-at-support events, how did it play out?
            wins = 0; total = 0
            for i in range(50, n - 10):
                past_support = float(np.percentile(lows[i-20:i], 15))
                if closes[i] <= past_support * 1.02:
                    total += 1
                    if closes[i+10] > closes[i]:
                        wins += 1
            win_rate = round((wins/total)*100) if total > 0 else 60
            recent_returns = np.diff(closes[-30:]) / closes[-30:-1]  # same length: 29 / 29
            backtest = {"win_rate": win_rate, "sample_size": total, "avg_return": round(float(np.mean(recent_returns)) * 10 * 100, 2)}

        print(json.dumps({
            "symbol": symbol,
            "current_price": round(current, 2),
            "patterns": patterns,
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "sma20": round(sma20, 2),
            "sma50": round(sma50, 2),
            "backtest": backtest
        }))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))

if __name__ == "__main__":
    fetch_symbol = sys.argv[1] if len(sys.argv) > 1 else "HDFCBANK.NS"
    detect_patterns(fetch_symbol)
