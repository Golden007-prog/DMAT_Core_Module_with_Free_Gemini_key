import { fetchAiGamPassage } from '../../ai/gamBatch';
import { useSettings } from '../../state/settingsStore';

/** The provider must never reach the network when the AI layer is not actually
 *  usable — a keyless or disabled call is pure local short-circuit (R7). */
describe('fetchAiGamPassage — gates before any network call', () => {
  const run = () =>
    fetchAiGamPassage({
      topicArea: 'economics',
      difficulty: 'medium',
      signal: new AbortController().signal,
    });

  it('returns null and sends no request when there is no gemini key', async () => {
    useSettings.setState({ geminiKey: '', aiGamEnabled: true });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    expect(await run()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null and sends no request when GAM generation is disabled', async () => {
    useSettings.setState({ geminiKey: 'AIza-test-key', aiGamEnabled: false });
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    expect(await run()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
