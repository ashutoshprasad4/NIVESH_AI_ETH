# ⚡ NIVESH AI: Web Dashboard

This is the primary user interface for NIVESH AI, built with **Next.js 15**, **Tailwind CSS**, and **Lucide Icons**.

---

## 🚀 Getting Started

### 📦 Installation

```bash
# Install dependencies
npm install
```

### 🔑 Environment Configuration

Create a `.env.local` file from the `.env.example` template:

```bash
cp .env.example .env.local
```

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_GEMINI_API_KEY` | **Required.** Your Google Gemini 1.5/2.0 API Key. |
| `NEXT_PUBLIC_OPENAI_API_KEY` | Optional. Your OpenAI API Key for GPT-4o. |
| `NEXT_PUBLIC_DEFAULT_MODEL` | Default AI model to use (gemini-2.0-flash, etc.). |

### 🛠️ Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📁 Key Directories

- `src/app`: Main application routes (Dashboard, Radar, Watchlist, Charts, AI APIs).
- `src/components`: UI components (Cards, Sidebar, Navbar).
- `src/lib`: Logic for API utilities (Gemini/OpenAI, Finance APIs).
- `public`: Static assets and icons.

---

## 📈 Tech Stack Highlights

- **Next.js 15 (App Router)**: Modern SSR/ISR for high performance.
- **Lightweight Charts (v5)**: High-performance financial data visualization.
- **Tailwind CSS 4**: Utility-first styling with modern CSS features.
- **Yahoo Finance 2**: Real-time ticker and market metadata.

---
*Powered by NIVESH AI Engine.*
