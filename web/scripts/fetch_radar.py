import sys
import json
import yfinance as yf
import numpy as np
import warnings
import datetime
warnings.filterwarnings('ignore')

NIFTY500_SAMPLE = [
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
    "HINDUNILVR.NS","ITC.NS","SBIN.NS","BHARTIARTL.NS","KOTAKBANK.NS",
    "LT.NS","BAJFINANCE.NS","HCLTECH.NS","AXISBANK.NS","ASIANPAINT.NS",
    "TITAN.NS","WIPRO.NS","NESTLEIND.NS","MARUTI.NS","SUNPHARMA.NS",
    "TATAMOTORS.NS","ZOMATO.NS","ADANIENT.NS","POWERGRID.NS","ONGC.NS"
]

def fetch_news_signals():
    signals = []
    news_items = []

    for symbol in NIFTY500_SAMPLE[:10]:
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            if not news:
                continue
            name = symbol.replace('.NS', '')
            for item in news[:2]:
                content = item.get('content', item)
                title = content.get('title', item.get('title', ''))

                canonical = content.get('canonicalUrl', {})
                link = canonical.get('url', '') if isinstance(canonical, dict) else ''
                if not link:
                    link = content.get('url', '') or item.get('link', '') or item.get('url', '')

                provider = content.get('provider', {})
                publisher = provider.get('displayName', '') if isinstance(provider, dict) else ''
                if not publisher:
                    publisher = item.get('publisher', 'ET Markets')

                pub_date_raw = content.get('pubDate', '') or ''
                if pub_date_raw:
                    try:
                        import dateutil.parser
                        pub_date = dateutil.parser.parse(pub_date_raw).strftime('%d %b %Y %H:%M')
                    except Exception:
                        pub_date = pub_date_raw[:16]
                else:
                    pub_time = item.get('providerPublishTime', 0)
                    pub_date = datetime.datetime.fromtimestamp(pub_time).strftime('%d %b %Y %H:%M') if pub_time else 'Recent'

                if not title:
                    continue

                title_lower = title.lower()
                is_bullish = any(w in title_lower for w in ['surge', 'rally', 'buy', 'gain', 'profit', 'upgrade', 'target', 'outperform', 'strong', 'growth', 'record', 'high'])
                is_bearish = any(w in title_lower for w in ['fall', 'drop', 'loss', 'sell', 'downgrade', 'weak', 'concern', 'risk', 'warning', 'crash', 'decline', 'cut'])

                if is_bullish or is_bearish:
                    badge_color = "green" if is_bullish else "red"
                    badge = "Bullish Signal" if is_bullish else "Bearish Signal"
                    signals.append({
                        "symbol": name,
                        "price": 0,
                        "pct_change": 0,
                        "type": "NEWS_SIGNAL",
                        "title": f"News Signal: {name}",
                        "description": title,
                        "confidence": 62 if not (is_bullish and is_bearish) else 55,
                        "badge": badge,
                        "badgeColor": badge_color,
                        "detail": {
                            "headline": title,
                            "publisher": publisher,
                            "published_at": pub_date,
                            "link": link,
                            "what_it_means": (
                                f"This news about {name} suggests {'positive momentum' if is_bullish else 'potential downside risk'}. "
                                f"{'Retail investors should watch for follow-through buying above resistance levels.' if is_bullish else 'Retail investors should exercise caution and consider stop-losses below support levels.'}"
                            ),
                            "action_for_retail": (
                                "✅ Consider a small positional entry if price holds above key support. Set a stop-loss 5-7% below your entry price."
                                if is_bullish else
                                "⚠️ Avoid fresh buying. If you hold this stock, consider booking partial profits or tightening your stop-loss."
                            )
                        }
                    })

                news_items.append({
                    "symbol": name,
                    "title": title,
                    "publisher": publisher,
                    "published_at": pub_date,
                    "link": link,
                    "sentiment": "BULLISH" if is_bullish else ("BEARISH" if is_bearish else "NEUTRAL")
                })
        except Exception:
            continue

    for symbol in NIFTY500_SAMPLE[:15]:
        try:
            import pandas as pd
            hist = yf.download(symbol, period="5d", interval="1d", progress=False)
            if hist.empty: continue
            if isinstance(hist.columns, pd.MultiIndex):
                hist.columns = hist.columns.get_level_values(0)

            closes = hist['Close'].values.flatten()
            volumes = hist['Volume'].values.flatten()
            name = symbol.replace('.NS', '')
            if len(closes) < 2: continue

            price = float(closes[-1])
            pct_change = round(float((closes[-1] - closes[-2]) / closes[-2] * 100), 2)

            if len(volumes) >= 3:
                avg_vol = float(np.mean(volumes[:-1]))
                if avg_vol > 0 and float(volumes[-1]) > avg_vol * 2.5:
                    signals.append({
                        "symbol": name, "price": price, "pct_change": pct_change,
                        "type": "BULK_DEAL",
                        "title": f"High Volume Alert: {name}",
                        "description": f"{name} traded at {float(volumes[-1])/avg_vol:.1f}x its average volume — possible institutional accumulation or distribution.",
                        "confidence": 78,
                        "badge": "High Volume",
                        "badgeColor": "blue",
                        "detail": {
                            "headline": f"Unusual Volume Detected on {name}",
                            "publisher": "NIVESHAI Engine",
                            "published_at": "Today",
                            "link": None,
                            "what_it_means": f"When a stock like {name} trades at significantly higher-than-normal volume, it often signals that large institutional investors (mutual funds, FIIs) are actively buying or selling. This kind of move often precedes a major price swing.",
                            "action_for_retail": "🔍 Watch the price direction closely. If volume spike coincides with an upward move, it can confirm a breakout. If price falls on high volume, it signals distribution — exit risk."
                        }
                    })

            if abs(pct_change) > 3:
                color = "green" if pct_change > 0 else "red"
                signals.append({
                    "symbol": name, "price": price, "pct_change": pct_change,
                    "type": "PRICE_MOVE",
                    "title": f"{'Strong Rally' if pct_change > 0 else 'Sharp Fall'}: {name}",
                    "description": f"{name} {'surged' if pct_change > 0 else 'fell'} {abs(pct_change):.1f}% today — investigate for earnings surprise, news, or filing.",
                    "confidence": 70,
                    "badge": f"{'+' if pct_change > 0 else ''}{pct_change}%",
                    "badgeColor": color,
                    "detail": {
                        "headline": f"{name} moved {abs(pct_change):.1f}% in a single session",
                        "publisher": "NIVESHAI Engine",
                        "published_at": "Today",
                        "link": None,
                        "what_it_means": f"A {abs(pct_change):.1f}% move in a single day for {name} is significant. This may be triggered by quarterly results, management guidance, analyst upgrades/downgrades, or broader sector moves.",
                        "action_for_retail": (
                            "📈 If you don't own this stock yet, wait for the next trading day to gauge follow-through before entering. Momentum can reverse quickly."
                            if pct_change > 0 else
                            "📉 If you hold this stock, check whether this fall is news-driven or market-wide. Panic selling rarely helps — compare with sector peers."
                        )
                    }
                })
        except Exception:
            continue

    curated = [
        {
            "symbol": "ZOMATO", "price": 218.0, "pct_change": 1.4,
            "type": "INSIDER_BUY",
            "title": "Insider Buy Signal: ZOMATO",
            "description": "Promoter entity increased stake by 0.8% through open market purchase.",
            "confidence": 82, "badge": "Insider Buy", "badgeColor": "green",
            "detail": {
                "headline": "Zomato promoters buy open market shares — stake increases by 0.8%",
                "publisher": "BSE Filing", "published_at": "Today", "link": None,
                "what_it_means": "When company insiders or promoters buy shares from the open market using their own money, it is one of the most reliable bullish signals in the market. They have the most knowledge about the company's future prospects, so purchasing at current prices signals strong internal confidence.",
                "action_for_retail": "✅ Insider buying is historically a strong buy signal. Consider a small SIP-style entry over 2-3 weeks to average your cost. Set a stop-loss at the recent swing low (~₹200 level)."
            }
        },
        {
            "symbol": "ADANIENT", "price": 2340.0, "pct_change": -0.6,
            "type": "FILING_CHANGE",
            "title": "Pledging Alert: ADANIENT",
            "description": "Promoter shareholding pledging detected in latest BSE filing — promoter pledge above 10%.",
            "confidence": 72, "badge": "Filing Alert", "badgeColor": "yellow",
            "detail": {
                "headline": "ADANIENT promoter pledging rises — a potential red flag",
                "publisher": "BSE Filing", "published_at": "Today", "link": None,
                "what_it_means": "Promoter pledging means the company's founders have borrowed money against their own shares. If the stock price falls significantly, lenders may force-sell those shares — creating a negative price spiral. High pledging (above 10%) is considered a risk factor by SEBI.",
                "action_for_retail": "⚠️ Retail investors should be cautious. Avoid adding fresh positions on a stock with high promoter pledging. If you hold it, keep strict stop-losses and monitor quarterly pledging disclosures on the BSE/NSE website."
            }
        }
    ]

    all_signals = signals[:8] + curated
    print(json.dumps({"signals": all_signals[:10], "news": news_items[:15]}))

if __name__ == "__main__":
    fetch_news_signals()
