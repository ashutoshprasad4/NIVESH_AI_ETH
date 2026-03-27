import sys
import json
import yfinance as yf
import numpy as np
import warnings
import datetime
warnings.filterwarnings('ignore')

NIFTY500_SAMPLE = [
    # Nifty 50 core
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
    "HINDUNILVR.NS","ITC.NS","SBIN.NS","BHARTIARTL.NS","KOTAKBANK.NS",
    "LT.NS","BAJFINANCE.NS","HCLTECH.NS","AXISBANK.NS","ASIANPAINT.NS",
    "TITAN.NS","WIPRO.NS","NESTLEIND.NS","MARUTI.NS","SUNPHARMA.NS",
    "TATAMOTORS.NS","ZOMATO.NS","ADANIENT.NS","POWERGRID.NS","ONGC.NS",
    # Nifty Next 50 additions
    "BAJAJFINSV.NS","TECHM.NS","NTPC.NS","JSWSTEEL.NS","ULTRACEMCO.NS",
    "GRASIM.NS","INDUSINDBK.NS","HINDALCO.NS","DRREDDY.NS","CIPLA.NS",
    "DIVISLAB.NS","APOLLOHOSP.NS","TATACONSUM.NS","EICHERMOT.NS","HEROMOTOCO.NS",
    "BPCL.NS","COALINDIA.NS","UPL.NS","SBILIFE.NS","HDFCLIFE.NS",
    # Mid-cap high-interest stocks
    "PIDILITIND.NS","DMART.NS","TATAPOWER.NS","IRCTC.NS","HAL.NS",
    "BEL.NS","MUTHOOTFIN.NS","CHOLAFIN.NS","PAYTM.NS","NYKAA.NS",
    "POLICYBZR.NS","DELHIVERY.NS","IRFC.NS","PFC.NS","RECLTD.NS",
    "GODREJCP.NS","MARICO.NS","DABUR.NS","COLPAL.NS","BERGEPAINT.NS",
]

def safe_float(val, default=0.0):
    try:
        return float(val)
    except:
        return default

def fetch_insider_and_filing_signals():
    """
    Detect INSIDER_BUY and FILING_CHANGE signals using ticker.info which reliably
    returns heldPercentInsiders and heldPercentInstitutions for NSE stocks.
    """
    signals = []

    for symbol in NIFTY500_SAMPLE:  # scan full universe
        name = symbol.replace('.NS', '')
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}

            pct_insiders     = safe_float(info.get('heldPercentInsiders', 0)) * 100
            pct_institutions = safe_float(info.get('heldPercentInstitutions', 0)) * 100
            current_price    = safe_float(info.get('currentPrice') or info.get('regularMarketPrice', 0))
            prev_close       = safe_float(info.get('previousClose', current_price))
            pct_chg          = round((current_price - prev_close) / prev_close * 100, 2) if prev_close else 0

            # ── INSIDER_BUY: promoter/insider stake > 30% ───────────────────
            # Indian promoters typically hold 40–75%; flag anything above 30% as signal
            if pct_insiders >= 30:
                confidence = min(95, int(45 + pct_insiders * 0.6))
                # Tiered messaging based on actual stake level
                if pct_insiders >= 65:
                    stake_comment = (f"At {pct_insiders:.1f}%, this is an extremely high promoter stake — "
                                     f"promoters and founding families own nearly two-thirds of {name}. "
                                     f"This leaves very little float for public trading, which can lead to lower liquidity "
                                     f"but also means the promoters are deeply invested in the company's long-term success.")
                    action = (f"High promoter concentration is a double-edged sword for {name}. "
                              f"It signals conviction but also means any promoter pledge or partial stake sale "
                              f"could trigger sharp price movements. Check for pledging data on NSE before investing. "
                              f"If pledge % is below 10%, this is a very clean ownership structure.")
                elif pct_insiders >= 50:
                    stake_comment = (f"Promoters hold {pct_insiders:.1f}% of {name} — a majority stake, "
                                     f"which is the standard for most Indian family-run businesses. "
                                     f"This means promoters have absolute control and are unlikely to allow activist investors "
                                     f"or hostile takeovers. It's a sign of stability and long-term thinking.")
                    action = (f"A {pct_insiders:.1f}% promoter stake in {name} is healthy. "
                              f"Watch next quarter's shareholding pattern (available on NSE.com) — "
                              f"if promoters are increasing this, it's a strong buy signal. "
                              f"If they're pledging shares, treat it as a red flag and reduce exposure.")
                else:
                    stake_comment = (f"Insiders hold {pct_insiders:.1f}% of {name}. "
                                     f"This is above the 30% threshold, indicating meaningful skin-in-the-game. "
                                     f"In the Indian market context, insider holdings above 30% typically represent "
                                     f"promoter groups who are aligned with company growth over market cycles.")
                    action = (f"The {pct_insiders:.1f}% insider stake in {name} is a positive quality signal. "
                              f"For retail investors, monitor whether this is increasing or decreasing quarter-over-quarter "
                              f"via BSE shareholding disclosures. Rising promoter stake = management confidence. "
                              f"Falling stake without explanation = potential exit signal.")

                signals.append({
                    "symbol": name,
                    "price": current_price,
                    "pct_change": pct_chg,
                    "type": "INSIDER_BUY",
                    "title": f"High Promoter Stake: {name}",
                    "description": (
                        f"Promoters/insiders hold {pct_insiders:.1f}% of {name}. "
                        "High insider ownership signals long-term conviction in the stock."
                    ),
                    "confidence": confidence,
                    "badge": f"Insider {pct_insiders:.1f}%",
                    "badgeColor": "green",
                    "detail": {
                        "headline": f"{name} promoters hold {pct_insiders:.1f}% — {'majority' if pct_insiders >= 50 else 'significant'} ownership stake",
                        "publisher": "BSE/NSE Shareholding · yfinance",
                        "published_at": "Latest Quarter",
                        "link": f"https://finance.yahoo.com/quote/{symbol}/holders",
                        "what_it_means": stake_comment,
                        "action_for_retail": action
                    }
                })

            # ── FILING_CHANGE: significant institutional holding ──────────────
            # Institutions hold 15–40% in most Nifty stocks; flag > 20% as notable
            if pct_institutions >= 20:
                confidence = min(88, int(50 + pct_institutions))
                # Tiered messaging based on institution % level
                if pct_institutions >= 40:
                    inst_comment = (f"Institutional investors (FIIs + DIIs combined) own {pct_institutions:.1f}% of {name}. "
                                    f"This is unusually high and signals that {name} is a top-conviction holding in major fund portfolios. "
                                    f"Stocks with >40% institutional ownership are subject to intense quarterly scrutiny — "
                                    f"even small guidance misses can trigger large sell-offs as funds rebalance.")
                    inst_action = (f"With {pct_institutions:.1f}% institutional ownership, {name} will react sharply to earnings. "
                                   f"If you invest here, track FII/DII data on NSE every month. "
                                   f"An increase in DII ownership alongside FII selling often signals domestic funds are supporting the stock — that's typically bullish. "
                                   f"Exit signals: 2+ consecutive quarters of falling institutional %, especially if combined with falling results.")
                elif pct_institutions >= 30:
                    inst_comment = (f"Institutions hold {pct_institutions:.1f}% of {name}, which is a strong vote of confidence from "
                                    f"professional money managers. Most Nifty 50 stocks hover in the 25–45% range — "
                                    f"{name} sitting at {pct_institutions:.1f}% means it has cleared the due-diligence bar of major fund houses. "
                                    f"FIIs are particularly discerning — if they're in, global macro factors also support this sector.")
                    inst_action = (f"For retail investors in {name}: institutional backing at {pct_institutions:.1f}% provides a "
                                   f"meaningful price floor (funds won't let it collapse without reason). "
                                   f"Best strategy: Buy on dips when FII data shows continued holding or accumulation. "
                                   f"Monitor quarterly 13F equivalent BSE disclosures for any large position unwind.")
                else:
                    inst_comment = (f"Foreign and domestic institutions hold {pct_institutions:.1f}% of {name}. "
                                    f"While this is above the 20% threshold we flag, it's in the moderate range. "
                                    f"This still means that nearly 1 in 5 shares is held by professional money managers "
                                    f"who conduct deep fundamental analysis before investing.")
                    inst_action = (f"A {pct_institutions:.1f}% institutional stake in {name} shows some smart money interest. "
                                   f"Watch if this percentage is trending up (institutions accumulating) or down (reducing exposure). "
                                   f"You can track this free on NSE.com under 'Shareholding Pattern' for each quarter. "
                                   f"Rising FII + DII combined ownership over 2 quarters is a strong buy signal.")

                signals.append({
                    "symbol": name,
                    "price": current_price,
                    "pct_change": pct_chg,
                    "type": "FILING_CHANGE",
                    "title": f"FII/DII Holding: {name}",
                    "description": (
                        f"Foreign & domestic institutions hold {pct_institutions:.1f}% of {name}. "
                        "Strong institutional conviction is typically a quality indicator."
                    ),
                    "confidence": confidence,
                    "badge": f"Inst. {pct_institutions:.1f}%",
                    "badgeColor": "yellow",
                    "detail": {
                        "headline": f"Institutions own {pct_institutions:.1f}% of {name} — {'very high' if pct_institutions >= 40 else 'high' if pct_institutions >= 30 else 'notable'} conviction",
                        "publisher": "NSE/BSE Shareholding · yfinance",
                        "published_at": "Latest Quarter",
                        "link": f"https://finance.yahoo.com/quote/{symbol}/holders",
                        "what_it_means": inst_comment,
                        "action_for_retail": inst_action
                    }
                })

        except:
            continue

    return signals


def fetch_news_signals():
    signals = []
    news_items = []

    # 1. BATCH DOWNLOAD HISTORICAL DATA (Fast) — BULK_DEAL + PRICE_MOVE
    symbols_for_data = NIFTY500_SAMPLE  # scan full universe
    try:
        all_hist = yf.download(
            symbols_for_data, period="5d", interval="1d",
            progress=False, group_by='ticker', auto_adjust=False
        )
        for symbol in symbols_for_data:
            try:
                hist = all_hist[symbol] if len(symbols_for_data) > 1 else all_hist
                if hist.empty:
                    continue
                ticker_df = hist.dropna(subset=['Close'])
                if ticker_df.empty:
                    continue

                closes  = ticker_df['Close'].values.flatten()
                volumes = ticker_df['Volume'].values.flatten()
                name    = symbol.replace('.NS', '')
                if len(closes) < 2:
                    continue

                price      = float(closes[-1])
                pct_change = round(float((closes[-1] - closes[-2]) / closes[-2] * 100), 2)

                 # High Volume Detection
                if len(volumes) >= 3:
                    avg_vol = float(np.mean(volumes[:-1]))
                    vol_ratio = float(volumes[-1]) / avg_vol
                    if avg_vol > 0 and vol_ratio > 2.5:
                        # Dynamic explanation based on vol ratio magnitude
                        if vol_ratio >= 10:
                            intensity = "extremely rare"
                            action_hint = "This level of volume is a major institutional event. Do NOT ignore it — check BSE/NSE announcements immediately."
                        elif vol_ratio >= 5:
                            intensity = "very unusual"
                            action_hint = f"A {vol_ratio:.1f}x spike often precedes a sharp directional move. Wait for price to confirm direction before entering."
                        else:
                            intensity = "notably elevated"
                            action_hint = f"Volume at {vol_ratio:.1f}x average suggests smart money is active. Watch if price closes above/below today's range."

                        price_note = f"Currently priced at ₹{price:.2f}"
                        if pct_change > 0:
                            price_note += f", up {pct_change:.1f}% today — volume + price rise = accumulation signal."
                        elif pct_change < 0:
                            price_note += f", down {abs(pct_change):.1f}% today — high volume with price fall may indicate distribution/panic selling."
                        else:
                            price_note += ", price is flat — volume without price move may signal pre-breakout consolidation."

                        signals.append({
                            "symbol": name, "price": price, "pct_change": pct_change,
                            "type": "BULK_DEAL",
                            "title": f"Bulk Volume Alert: {name}",
                            "description": f"{name} traded at {vol_ratio:.1f}x its 4-day average volume today.",
                            "confidence": min(92, int(60 + vol_ratio * 4)), "badge": f"{vol_ratio:.1f}x Volume", "badgeColor": "blue",
                            "detail": {
                                "headline": f"{name} sees {intensity} volume — {vol_ratio:.1f}× its normal daily average",
                                "publisher": "NIVESHAI Engine · NSE Data", "published_at": "Today",
                                "link": f"https://finance.yahoo.com/quote/{symbol}",
                                "what_it_means": (
                                    f"{name} just traded {vol_ratio:.1f}x its recent average volume — that's {intensity}. "
                                    f"{price_note} "
                                    f"High volume spikes almost always mean large institutions (mutual funds, FIIs, or HNIs) are "
                                    f"either aggressively buying or distributing their holdings. Retail investors rarely move "
                                    f"volume needles this much."
                                ),
                                "action_for_retail": action_hint
                            }
                        })

                # Price Move Detection
                if abs(pct_change) > 3:
                    color = "green" if pct_change > 0 else "red"
                    is_big = abs(pct_change) > 7
                    direction_word = "surged" if pct_change > 0 else "dropped"
                    # Context-aware explanations
                    if pct_change > 0:
                        if pct_change > 7:
                            wim = (f"{name} has jumped +{pct_change:.1f}% today, which is a circuit-breaker-level move. "
                                   f"At ₹{price:.2f}, this kind of move is usually triggered by a major positive event — "
                                   f"earnings beat, large order win, FII buying, or index inclusion. "
                                   f"Check BSE corporate announcements for any undisclosed news.")
                            afr = (f"Do NOT chase a +{pct_change:.1f}% move blindly. Wait for the stock to consolidate for "
                                   f"1–2 sessions. If it holds above today's close, it may continue. Set a strict stop-loss "
                                   f"below today's low (₹{price*(1-0.03):.0f}) before entering.")
                        else:
                            wim = (f"{name} gained {pct_change:.1f}% today, closing around ₹{price:.2f}. "
                                   f"A {pct_change:.1f}% single-day move for a Nifty-listed stock is significant and often indicates "
                                   f"momentum buy programs, short covering, or fresh institutional buying. "
                                   f"Check if this aligns with any sector tailwind or results announcement.")
                            afr = (f"If you already hold {name}, consider trailing your stop-loss up. "
                                   f"For fresh entry, look for a pullback to ₹{price*0.97:.0f}–₹{price*0.98:.0f} range "
                                   f"with reduced volume — that's a healthier entry than buying at the top of a {pct_change:.1f}% move.")
                    else:
                        if abs(pct_change) > 7:
                            wim = (f"{name} has fallen {abs(pct_change):.1f}% today to ₹{price:.2f} — a sharp decline. "
                                   f"Drops of this magnitude often signal negative news: earnings miss, promoter pledge, "
                                   f"regulatory issue, or sector-wide selling. At this level, panic selling from retail "
                                   f"investors may amplify the fall further.")
                            afr = (f"Avoid buying a falling knife. Let {name} stabilize for at least 1–2 sessions. "
                                   f"A reliable entry would be only if price reclaims ₹{price*1.03:.0f} on strong volume. "
                                   f"If you hold it, decide your exit based on fundamental thesis — don't average down blindly.")
                        else:
                            wim = (f"{name} fell {abs(pct_change):.1f}% today to ₹{price:.2f}. "
                                   f"This could be profit-taking after a recent run-up, or mild sector rotation. "
                                   f"A {abs(pct_change):.1f}% fall on below-average volume is less concerning than the same "
                                   f"fall on high volume — check volume context carefully.")
                            afr = (f"Don't panic on a {abs(pct_change):.1f}% dip alone. Check if {name}'s fundamentals have changed. "
                                   f"If no news and volume is normal, this may be a short-term dip-buy opportunity near ₹{price*0.97:.0f}. "
                                   f"Use a stop-loss below ₹{price*0.94:.0f} to manage downside risk.")

                    signals.append({
                        "symbol": name, "price": price, "pct_change": pct_change,
                        "type": "PRICE_MOVE",
                        "title": f"{'Strong Rally' if pct_change > 0 else 'Sharp Fall'}: {name}",
                        "description": f"{name} {direction_word} {abs(pct_change):.1f}% today, closing at ₹{price:.2f}.",
                        "confidence": min(85, int(55 + abs(pct_change) * 2)),
                        "badge": f"{'+' if pct_change > 0 else ''}{pct_change}%", "badgeColor": color,
                        "detail": {
                            "headline": f"{name} {direction_word} {abs(pct_change):.1f}% to ₹{price:.2f} — {'bullish momentum' if pct_change > 0 else 'bearish pressure'} in play",
                            "publisher": "NIVESHAI Engine · NSE Data", "published_at": "Today",
                            "link": f"https://finance.yahoo.com/quote/{symbol}",
                            "what_it_means": wim,
                            "action_for_retail": afr
                        }
                    })
            except:
                continue
    except:
        pass

    # 2. FETCH NEWS (Top 6 symbols, 2 stories each)
    for symbol in NIFTY500_SAMPLE[:15]:  # top 15 stocks for news (each has ~5 stories)
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            if not news:
                continue
            name = symbol.replace('.NS', '')
            for item in news[:3]:  # up to 3 stories per stock
                content = item.get('content', item)
                title   = content.get('title', item.get('title', ''))
                if not title:
                    continue

                # Extract real link
                link = (
                    content.get('canonicalUrl', {}).get('url')
                    or content.get('url')
                    or item.get('link')
                    or item.get('url')
                    or ''
                )

                # Publisher
                provider = content.get('provider', {})
                publisher = provider.get('displayName', 'MarketNews') if isinstance(provider, dict) else 'MarketNews'

                # Sentiment
                title_lower = title.lower()
                is_bullish = any(w in title_lower for w in ['surge', 'rally', 'buy', 'gain', 'profit', 'upgrade', 'target', 'strong', 'growth', 'record', 'high'])
                is_bearish = any(w in title_lower for w in ['fall', 'drop', 'loss', 'sell', 'downgrade', 'weak', 'risk', 'warning', 'crash', 'concern'])
                sentiment  = "BULLISH" if is_bullish else ("BEARISH" if is_bearish else "NEUTRAL")

                if is_bullish or is_bearish:
                    # Extract key trigger words found in the headline
                    bullish_words = ['surge', 'rally', 'buy', 'gain', 'profit', 'upgrade', 'target', 'strong', 'growth', 'record', 'high']
                    bearish_words = ['fall', 'drop', 'loss', 'sell', 'downgrade', 'weak', 'risk', 'warning', 'crash', 'concern']
                    matched_bull = [w for w in bullish_words if w in title_lower]
                    matched_bear = [w for w in bearish_words if w in title_lower]
                    trigger_words = matched_bull if is_bullish else matched_bear
                    trigger_str = ", ".join(f"'{w}'" for w in trigger_words[:3]) if trigger_words else "sentiment keywords"

                    if is_bullish:
                        wim = (f"A news headline about {name} contains {trigger_str} — classified as a BULLISH signal. "
                               f"Media coverage with positive language often reflects or precedes institutional attention on a stock. "
                               f"Headlines with words like {trigger_str} have historically correlated with short-term upward price pressure, "
                               f"especially when they concern earnings, analyst upgrades, or management guidance.")
                        afr = (f"Don't buy {name} purely based on a headline. First confirm: (1) Is the price already up on this news? "
                               f"If yes, the move may be priced in. (2) Is volume above average today? If yes, "
                               f"smart money is paying attention. Consider a small starter position if price pulls back 1–2% from today's high.")
                    else:
                        wim = (f"A news headline about {name} contains {trigger_str} — classified as a BEARISH signal. "
                               f"Negative media coverage often amplifies existing selling pressure or reveals information "
                               f"the market hasn't fully priced in yet. Words like {trigger_str} in financial headlines are "
                               f"closely monitored by algorithmic traders and can trigger stop-loss cascades.")
                        afr = (f"If you hold {name}: check whether the negative news is fundamental (earnings miss, regulatory issue) "
                               f"or temporary (sector rotation, macro noise). Fundamental issues warrant a review of your position. "
                               f"Temporary news-driven dips on strong stocks are often buy opportunities for patient investors.")

                    signals.append({
                        "symbol": name, "price": 0, "pct_change": 0,
                        "type": "NEWS_SIGNAL",
                        "title": f"{'Bullish' if is_bullish else 'Bearish'} News: {name}",
                        "description": title,
                        "confidence": 60,
                        "badge": "Bullish" if is_bullish else "Bearish",
                        "badgeColor": "green" if is_bullish else "red",
                        "detail": {
                            "headline": title, "publisher": publisher,
                            "published_at": "Today", "link": link,
                            "what_it_means": wim,
                            "action_for_retail": afr
                        }
                    })

                news_items.append({
                    "symbol": name, "title": title, "publisher": publisher,
                    "published_at": "Today", "sentiment": sentiment,
                    "link": link
                })
        except:
            continue

    # 3. LIVE INSIDER_BUY + FILING_CHANGE signals
    insider_filing_signals = fetch_insider_and_filing_signals()

    all_signals = signals + insider_filing_signals

    # Sort: highest confidence first
    all_signals.sort(key=lambda x: x.get('confidence', 0), reverse=True)

    # Cap per signal type at 15 so no single type floods the feed
    from collections import defaultdict
    type_counts: dict = defaultdict(int)
    MAX_PER_TYPE = 15
    capped_signals = []
    for s in all_signals:
        t = s.get('type', 'OTHER')
        if type_counts[t] < MAX_PER_TYPE:
            capped_signals.append(s)
            type_counts[t] += 1

    print(json.dumps({"signals": capped_signals, "news": news_items[:50]}))


if __name__ == "__main__":
    fetch_news_signals()