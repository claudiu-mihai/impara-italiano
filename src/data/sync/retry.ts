/** Pauzele dintre încercări când serverul răspunde „prea multe cereri” (429): 1 s, 2 s, 4 s, 8 s. */
export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Repetă `run` cât timp eroarea merită reîncercată (ex. limita de cereri a serverului), cu pauze tot mai lungi.
 * Orice altă eroare, sau epuizarea încercărilor, se aruncă mai departe.
 */
export async function withRetry<T>(
  run: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  delays: readonly number[] = RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = wait,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const pause = delays[attempt];
      if (pause === undefined || !isRetryable(error)) throw error;
      await sleep(pause);
    }
  }
}
