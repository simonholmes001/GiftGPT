# GiftGPT

GiftGPT is a modern, AI-powered gift suggestion web app that leverages OpenAI's GPT-4o audio model for both text and audio chat. It features a beautiful, animated landing page and a seamless chat experience for users seeking the perfect gift ideas.

## Features

- **Conversational Gift Assistant:**
  - Powered by OpenAI GPT-4o audio (API version 2024-12-17)
  - Supports both text and audio input/output
  - Real-time streaming responses
- **Animated Landing Page:**
  - Fluid, random, and continuous floating gift icon animation
- **Modern UI:**
  - Built with Next.js, React, and Tailwind CSS
  - Responsive and mobile-friendly
- **Backend:**
  - ASP.NET Core Web API
  - Proxies requests to OpenAI and streams audio/text responses

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- .NET 8 SDK
- An OpenAI API key with access to GPT-4o audio

### Setup

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/GiftGPT.git
cd GiftGPT
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

#### 3. Backend Setup
```bash
cd ../backend
dotnet restore
dotnet run
```
The backend will be available at `http://localhost:5000` (or as configured).

#### 4. Configuration
- Update the OpenAI API key usage in the frontend and backend as needed for your deployment.

## Usage
- Visit the landing page to enjoy the animated experience.
- Type or record your gift-related question.
- Receive instant, streaming suggestions from GiftGPT.

## Project Structure
```
backend/    # ASP.NET Core Web API (OpenAI proxy)
frontend/   # Next.js app (UI, animation, chat)
```

## Customization
- Tweak the animation in `frontend/app/page.tsx` and `frontend/app/globals.css`.
- Adjust backend logic in `backend/Controllers/ChatController.cs`.

## License
MIT

---

**GiftGPT** — Find the perfect gift, powered by AI.
