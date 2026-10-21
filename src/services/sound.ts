let context: AudioContext | undefined;

function tone(frequency: number, start: number, duration: number, volume = 0.15) {
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(context.currentTime + start);
  osc.stop(context.currentTime + start + duration);
}

/** Sunet scurt pentru răspuns corect (două note în sus) sau greșit (o notă joasă). */
export function playFeedback(correct: boolean, enabled: boolean): void {
  if (!enabled || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    if (correct) {
      tone(660, 0, 0.12);
      tone(880, 0.1, 0.16);
    } else {
      tone(180, 0, 0.28, 0.2);
    }
  } catch {
    // fără audio nu e o problemă pentru învățare
  }
}
