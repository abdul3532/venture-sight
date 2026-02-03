# FinMate Next.js - Frontend

Modern React frontend for FinMate built with Vite, TypeScript, and Tailwind CSS.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment (optional):**
```bash
# Create .env file if you need to change the API URL
echo "VITE_API_URL=http://localhost:8000" > .env
```

3. **Run development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

### Dashboard
- View portfolio summary
- Latest news with AI analysis
- Refresh news from CNBC
- Generate PDF briefings
- Color-coded sentiment indicators

### Portfolio
- Add/remove tickers
- Real-time portfolio management
- Persistent storage via backend API

### AI Assistant
- Chat with AI about portfolio and news
- Upload PDF documents for analysis
- Context-aware responses
- Document and news integration

## Tech Stack

- **Framework:** Vite + React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Icons:** Lucide React

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── Navbar.tsx   # Navigation component
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Portfolio.tsx
│   │   └── Chat.tsx
│   ├── lib/
│   │   ├── api.ts       # API client & hooks
│   │   ├── types.ts     # TypeScript interfaces
│   │   └── utils.ts     # Utility functions
│   ├── App.tsx
│   └── index.css
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000` by default.

Make sure the backend is running before starting the frontend:
```bash
cd ../backend
uvicorn main:app --reload
```
