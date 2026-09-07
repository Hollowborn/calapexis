/**
 * Web Audio API Notification Synthesizer
 * Zero-dependency, lightweight, high-fidelity audio chimes for real-time alerts.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === "suspended") {
		audioCtx.resume();
	}
	return audioCtx;
}

export type ChimeTone = "pass_registered" | "desk_arrival" | "checkout" | "default";

/**
 * Plays a pleasant, non-intrusive harmonic chime.
 */
export function playNotificationChime(tone: ChimeTone = "default") {
	try {
		const ctx = getAudioContext();
		if (!ctx) return;

		const now = ctx.currentTime;

		// Configure frequency chords based on notification tone
		let freq1 = 659.25; // E5
		let freq2 = 880.0;  // A5

		if (tone === "pass_registered") {
			freq1 = 587.33; // D5
			freq2 = 880.0;  // A5
		} else if (tone === "desk_arrival") {
			freq1 = 659.25; // E5
			freq2 = 1046.5; // C6
		} else if (tone === "checkout") {
			freq1 = 783.99; // G5
			freq2 = 523.25; // C5
		}

		// Tone 1
		const osc1 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		osc1.type = "sine";
		osc1.frequency.setValueAtTime(freq1, now);
		gain1.gain.setValueAtTime(0.08, now);
		gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

		osc1.connect(gain1);
		gain1.connect(ctx.destination);
		osc1.start(now);
		osc1.stop(now + 0.35);

		// Tone 2 (Harmonic overtone)
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(freq2, now + 0.1);
		gain2.gain.setValueAtTime(0.1, now + 0.1);
		gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

		osc2.connect(gain2);
		gain2.connect(ctx.destination);
		osc2.start(now + 0.1);
		osc2.stop(now + 0.55);
	} catch (e) {
		console.warn("Audio chime playback prevented by browser audio policy:", e);
	}
}
