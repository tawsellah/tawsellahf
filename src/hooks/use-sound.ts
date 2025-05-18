"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export const useToneSynth = (note: string = "C4", volume: number = -10) => {
  const synth = useRef<Tone.Synth | null>(null);
  const isInitialized = useRef(false);

  const initializeSynth = useCallback(() => {
    if (typeof window !== "undefined" && Tone && Tone.Synth && !isInitialized.current) {
      const newSynth = new Tone.Synth().toDestination();
      newSynth.volume.value = volume;
      synth.current = newSynth;
      isInitialized.current = true;
    }
  }, [volume]);

  useEffect(() => {
    initializeSynth(); // Initialize on mount
    return () => {
      if (synth.current) {
        synth.current.dispose();
        isInitialized.current = false; // Reset for potential re-initialization
      }
    }
  }, [initializeSynth]); // Depend on initializeSynth
  
  const play = useCallback(async () => {
    if (!isInitialized.current) { // Ensure synth is initialized before playing
      initializeSynth();
    }

    if(synth.current) {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        synth.current.triggerAttackRelease(note, "8n", Tone.now());
      } catch (error) {
        console.error("Error playing synth:", error);
      }
    } else {
        console.warn("Synth not initialized yet. Call initialize or wait for mount.");
    }
  }, [note, initializeSynth]); // Depend on note and initializeSynth

  return play;
}
