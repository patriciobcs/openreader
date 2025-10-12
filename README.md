# OpenReader

A modern text-to-speech web application similar to ElevenReader, built with Next.js and powered by SLNG// TTS API.

## Features

✨ **Smart Text-to-Speech** - Convert any text into natural-sounding speech  
📝 **Real-Time Highlighting** - See each word highlighted as it's spoken  
⚡ **Efficient Chunking** - Process text in 50-word chunks for smooth playback  
🎯 **Smart Pre-loading** - Next chunk loads as current one plays  
🎮 **Playback Controls** - Adjust speed, skip forward/backward  
💾 **Demo Caching** - Cached responses for faster demo playback  
📱 **Responsive Design** - Works seamlessly on mobile and desktop

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up your API key:**
   Create a `.env.local` file:
   ```bash
   SLNG_API_KEY=your_api_key_here
   ```
   Get your API key at [slng.ai](https://slng.ai)

3. **Run the development server:**
   ```bash
   bun dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

1. Enter your text or click "Use Demo" to try the sample
2. Click Play to start narration
3. Watch as each word is highlighted in real-time
4. Control playback speed and skip through the audio

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library with modern hooks
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **SLNG// API** - Text-to-speech engine
- **Bun** - Fast JavaScript runtime and package manager

## Documentation

For detailed setup instructions, architecture details, and troubleshooting, see [SETUP.md](./SETUP.md).

## Project Structure

```
├── app/
│   ├── api/tts/          # TTS API endpoint
│   ├── page.tsx          # Main application
│   └── layout.tsx        # Root layout
├── components/
│   ├── reader/           # Reader components
│   └── ui/               # shadcn components
├── hooks/
│   └── use-audio-manager.ts  # Audio playback logic
└── lib/
    ├── text-utils.ts     # Text processing utilities
    └── types.ts          # TypeScript types
```

## License

MIT

---

Built with ❤️ using Next.js and SLNG// TTS API
