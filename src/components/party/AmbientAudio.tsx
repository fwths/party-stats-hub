import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Flame, Wind, Sparkles, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AmbientAudio() {
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Sound toggles
  const [fireActive, setFireActive] = useState(false);
  const [windActive, setWindActive] = useState(false);
  const [arcaneActive, setArcaneActive] = useState(false);

  // Volumes (0 to 1)
  const [fireVol, setFireVol] = useState(0.4);
  const [windVol, setWindVol] = useState(0.4);
  const [arcaneVol, setArcaneVol] = useState(0.3);

  // Web Audio Nodes references
  const masterGainRef = useRef<GainNode | null>(null);

  const fireSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fireGainRef = useRef<GainNode | null>(null);
  const fireIntervalRef = useRef<any>(null);

  const windSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const windLfoRef = useRef<OscillatorNode | null>(null);

  const arcaneOsc1Ref = useRef<OscillatorNode | null>(null);
  const arcaneOsc2Ref = useRef<OscillatorNode | null>(null);
  const arcaneGainRef = useRef<GainNode | null>(null);
  const arcaneLfoRef = useRef<OscillatorNode | null>(null);

  // Initialize AudioContext on first user interaction
  const initAudio = () => {
    if (audioCtx) return audioCtx;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.8, ctx.currentTime);

    masterGainRef.current = masterGain;
    setAudioCtx(ctx);
    return ctx;
  };

  // Create a 2-second white noise buffer for wind/rumble
  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  // Mute / Unmute
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (masterGainRef.current && audioCtx) {
      masterGainRef.current.gain.setValueAtTime(nextMute ? 0 : 0.8, audioCtx.currentTime);
    }
  };

  // Campfire implementation
  useEffect(() => {
    if (!audioCtx) return;

    if (fireActive) {
      // Create fire gain node
      const fireGain = audioCtx.createGain();
      fireGain.gain.setValueAtTime(fireVol, audioCtx.currentTime);
      fireGain.connect(masterGainRef.current!);
      fireGainRef.current = fireGain;

      // 1. Low rumble of the fire (lowpassed noise)
      const noiseBuffer = createNoiseBuffer(audioCtx);
      const rumbleSource = audioCtx.createBufferSource();
      rumbleSource.buffer = noiseBuffer;
      rumbleSource.loop = true;

      const rumbleFilter = audioCtx.createBiquadFilter();
      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(120, audioCtx.currentTime);

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(fireGain);
      rumbleSource.start();
      fireSourceRef.current = rumbleSource;

      // 2. High-frequency crackle/pop interval
      const playCrackle = () => {
        if (!audioCtx || fireGain.gain.value === 0) return;

        // Crackle pop generator
        const osc = audioCtx.createOscillator();
        const popGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = "sine";
        // random high pitch crackle
        osc.frequency.setValueAtTime(1500 + Math.random() * 2500, audioCtx.currentTime);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2500, audioCtx.currentTime);
        filter.Q.setValueAtTime(8, audioCtx.currentTime);

        popGain.gain.setValueAtTime(0.01 + Math.random() * 0.08, audioCtx.currentTime);
        // Extremely fast decay
        popGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);

        osc.connect(filter);
        filter.connect(popGain);
        popGain.connect(fireGain);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
      };

      // Set random crackles
      const crackleLoop = () => {
        playCrackle();
        const nextInterval = 80 + Math.random() * 280; // random milliseconds
        fireIntervalRef.current = setTimeout(crackleLoop, nextInterval);
      };
      crackleLoop();
    } else {
      // Stop fire
      if (fireSourceRef.current) {
        try {
          fireSourceRef.current.stop();
        } catch {}
        fireSourceRef.current = null;
      }
      if (fireIntervalRef.current) {
        clearTimeout(fireIntervalRef.current);
        fireIntervalRef.current = null;
      }
      fireGainRef.current = null;
    }

    return () => {
      if (fireIntervalRef.current) clearTimeout(fireIntervalRef.current);
    };
  }, [fireActive, audioCtx, fireVol]);

  // Adjust fire volume
  useEffect(() => {
    if (fireGainRef.current && audioCtx) {
      fireGainRef.current.gain.linearRampToValueAtTime(fireVol, audioCtx.currentTime + 0.1);
    }
  }, [fireVol, audioCtx]);

  // Wind implementation
  useEffect(() => {
    if (!audioCtx) return;

    if (windActive) {
      const windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(windVol, audioCtx.currentTime);
      windGain.connect(masterGainRef.current!);
      windGainRef.current = windGain;

      // Noise generator
      const noiseBuffer = createNoiseBuffer(audioCtx);
      const windSource = audioCtx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      // Filter to simulate gusts
      const windFilter = audioCtx.createBiquadFilter();
      windFilter.type = "bandpass";
      windFilter.Q.setValueAtTime(2.0, audioCtx.currentTime);

      // LFO to modulate filter frequency (creates gusts of wind)
      const lfo = audioCtx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.07, audioCtx.currentTime); // slow wave

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(250, audioCtx.currentTime); // sweep width

      // Modulate filter cutoff (between 150Hz and 650Hz)
      windFilter.frequency.setValueAtTime(400, audioCtx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      windSource.connect(windFilter);
      windFilter.connect(windGain);

      lfo.start();
      windSource.start();

      windSourceRef.current = windSource;
      windLfoRef.current = lfo;
    } else {
      if (windSourceRef.current) {
        try {
          windSourceRef.current.stop();
        } catch {}
        windSourceRef.current = null;
      }
      if (windLfoRef.current) {
        try {
          windLfoRef.current.stop();
        } catch {}
        windLfoRef.current = null;
      }
      windGainRef.current = null;
    }
  }, [windActive, audioCtx, windVol]);

  // Adjust wind volume
  useEffect(() => {
    if (windGainRef.current && audioCtx) {
      windGainRef.current.gain.linearRampToValueAtTime(windVol, audioCtx.currentTime + 0.1);
    }
  }, [windVol, audioCtx]);

  // Arcane Hum implementation
  useEffect(() => {
    if (!audioCtx) return;

    if (arcaneActive) {
      const arcaneGain = audioCtx.createGain();
      arcaneGain.gain.setValueAtTime(arcaneVol, audioCtx.currentTime);
      arcaneGain.connect(masterGainRef.current!);
      arcaneGainRef.current = arcaneGain;

      // Deep beating detuned oscillators
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(65, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(65.4, audioCtx.currentTime); // 0.4Hz detune

      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, audioCtx.currentTime);

      // LFO to sweep a subtle high filter peak for shimmer
      const lfo = audioCtx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime);

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(40, audioCtx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      filter.connect(arcaneGain);

      osc1.start();
      osc2.start();
      lfo.start();

      arcaneOsc1Ref.current = osc1;
      arcaneOsc2Ref.current = osc2;
      arcaneLfoRef.current = lfo;
    } else {
      if (arcaneOsc1Ref.current) {
        try {
          arcaneOsc1Ref.current.stop();
        } catch {}
        arcaneOsc1Ref.current = null;
      }
      if (arcaneOsc2Ref.current) {
        try {
          arcaneOsc2Ref.current.stop();
        } catch {}
        arcaneOsc2Ref.current = null;
      }
      if (arcaneLfoRef.current) {
        try {
          arcaneLfoRef.current.stop();
        } catch {}
        arcaneLfoRef.current = null;
      }
      arcaneGainRef.current = null;
    }
  }, [arcaneActive, audioCtx, arcaneVol]);

  // Adjust arcane volume
  useEffect(() => {
    if (arcaneGainRef.current && audioCtx) {
      arcaneGainRef.current.gain.linearRampToValueAtTime(arcaneVol, audioCtx.currentTime + 0.1);
    }
  }, [arcaneVol, audioCtx]);

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      if (fireSourceRef.current)
        try {
          fireSourceRef.current.stop();
        } catch {}
      if (fireIntervalRef.current) clearTimeout(fireIntervalRef.current);
      if (windSourceRef.current)
        try {
          windSourceRef.current.stop();
        } catch {}
      if (windLfoRef.current)
        try {
          windLfoRef.current.stop();
        } catch {}
      if (arcaneOsc1Ref.current)
        try {
          arcaneOsc1Ref.current.stop();
        } catch {}
      if (arcaneOsc2Ref.current)
        try {
          arcaneOsc2Ref.current.stop();
        } catch {}
      if (arcaneLfoRef.current)
        try {
          arcaneLfoRef.current.stop();
        } catch {}
    };
  }, []);

  const handleFireToggle = () => {
    const ctx = initAudio();
    if (ctx.state === "suspended") ctx.resume();
    setFireActive(!fireActive);
  };

  const handleWindToggle = () => {
    const ctx = initAudio();
    if (ctx.state === "suspended") ctx.resume();
    setWindActive(!windActive);
  };

  const handleArcaneToggle = () => {
    const ctx = initAudio();
    if (ctx.state === "suspended") ctx.resume();
    setArcaneActive(!arcaneActive);
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/55 px-2.5 py-1 text-xs">
      <span className="font-semibold text-muted-foreground select-none flex items-center gap-1">
        <span>🔊</span>
        <span className="hidden sm:inline">Ambient Audio</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle size={10} className="text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              Offline-capable synthesized ambient sounds. Toggles activate sound generators in your
              browser.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>

      {/* Campfire control */}
      <button
        onClick={handleFireToggle}
        className={`flex items-center justify-center p-1 rounded transition-colors duration-200 cursor-pointer ${
          fireActive
            ? "text-ui-rose bg-ui-rose/10 border border-ui-rose/30"
            : "text-muted-foreground/60 border border-transparent hover:text-foreground"
        }`}
      >
        <Flame size={12} className={fireActive ? "animate-pulse" : ""} />
      </button>
      {fireActive && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={fireVol}
          onChange={(e) => setFireVol(parseFloat(e.target.value))}
          className="w-12 h-1 accent-rose-500 cursor-pointer bg-secondary"
        />
      )}

      {/* Wind control */}
      <button
        onClick={handleWindToggle}
        className={`flex items-center justify-center p-1 rounded transition-colors duration-200 cursor-pointer ${
          windActive
            ? "text-ui-sky bg-ui-sky/10 border border-ui-sky/30"
            : "text-muted-foreground/60 border border-transparent hover:text-foreground"
        }`}
      >
        <Wind size={12} />
      </button>
      {windActive && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={windVol}
          onChange={(e) => setWindVol(parseFloat(e.target.value))}
          className="w-12 h-1 accent-sky-400 cursor-pointer bg-secondary"
        />
      )}

      {/* Arcane hum control */}
      <button
        onClick={handleArcaneToggle}
        className={`flex items-center justify-center p-1 rounded transition-colors duration-200 cursor-pointer ${
          arcaneActive
            ? "text-gold bg-gold/10 border border-gold/30"
            : "text-muted-foreground/60 border border-transparent hover:text-foreground"
        }`}
      >
        <Sparkles size={12} />
      </button>
      {arcaneActive && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={arcaneVol}
          onChange={(e) => setArcaneVol(parseFloat(e.target.value))}
          className="w-12 h-1 accent-gold cursor-pointer bg-secondary"
        />
      )}

      <div className="h-4 w-px bg-border/50 mx-1" />

      {/* Master mute control */}
      <button
        onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
      >
        {isMuted ? <VolumeX size={13} className="text-destructive" /> : <Volume2 size={13} />}
      </button>
    </div>
  );
}
