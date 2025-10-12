# OpenReader

A modern text-to-speech web application similar to ElevenReader, built with Next.js and powered by SLNG// TTS API.

## Features

✨ **Smart Text-to-Speech** - Convert any text into natural-sounding speech  
📝 **Real-Time Highlighting** - See each word highlighted as it's spoken  
🔗 **URL Content Extraction** - Paste any URL and we'll fetch and read the content  
⚡ **Efficient Chunking** - Process text in optimized chunks for smooth playback  
🎯 **Smart Pre-loading** - Next chunk loads as current one plays  
🎮 **Playback Controls** - Adjust speed, skip forward/backward, click-to-seek  
🎨 **Immersive Modes** - Focus, Ambient (with AI-generated images), Vivid, and Theater modes  
💾 **Smart Caching** - Cached responses for faster demo playback and image generation  
📱 **Responsive Design** - Works seamlessly on mobile and desktop

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up your API keys:**
   Create a `.env.local` file:
   ```bash
   # Required for TTS
   SLNG_API_KEY=your_slng_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # Required for immersion images
   RUNWARE_API_KEY=your_runware_api_key_here
   
   # Required for URL content extraction
   LINKUP_API_KEY=your_linkup_api_key_here
   ```
   - Get SLNG API key at [slng.ai](https://slng.ai)
   - Get ElevenLabs API key at [elevenlabs.io](https://elevenlabs.io)
   - Get Runware API key at [runware.ai](https://runware.ai)
   - Get Linkup API key at [linkup.so](https://www.linkup.so)

3. **Run the development server:**
   ```bash
   bun dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Input your content:**
   - Enter text directly in the Text tab
   - Paste a URL in the URL tab to extract article content automatically
   - Or click "Use Demo" to try the sample

2. **Start playback:**
   - Click Play to start narration
   - Watch as each word is highlighted in real-time
   - Click any word to jump to that position

3. **Customize your experience:**
   - Adjust playback speed (0.5x to 2x)
   - Choose immersion modes (Focus, Ambient, Vivid, Theater)
   - In Ambient/Vivid/Theater modes, AI-generated images enhance your reading

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library with modern hooks
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **ElevenLabs & SLNG APIs** - Text-to-speech engines
- **Runware API** - AI image generation
- **Linkup API** - Web content extraction
- **Bun** - Fast JavaScript runtime and package manager

## Documentation

For detailed setup instructions, architecture details, and troubleshooting, see [SETUP.md](./SETUP.md).

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── tts/          # TTS API endpoint
│   │   ├── immersion/    # AI image generation
│   │   └── linkup/       # Web content extraction
│   ├── page.tsx          # Main application
│   └── layout.tsx        # Root layout
├── components/
│   ├── reader/           # Reader components
│   └── ui/               # shadcn components
├── hooks/
│   └── use-audio-manager.ts  # Audio playback logic
└── lib/
    ├── text-utils.ts     # Text processing utilities
    ├── elevenlabs-utils.ts  # ElevenLabs utilities
    └── types.ts          # TypeScript types
```

## License

MIT

---

Built with ❤️ using Next.js, ElevenLabs, SLNG, Runware, and Linkup
