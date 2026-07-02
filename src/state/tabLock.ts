/** Two-tab guard (§11): the second tab becomes read-only so parallel answers
 *  can never race the persisted snapshot. */
export function initTabLock(onLocked: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel('coreforge-tab-lock');
  let isPrimary = true;
  channel.onmessage = (e: MessageEvent) => {
    if (e.data === 'claim' && isPrimary) {
      channel.postMessage('held');
    } else if (e.data === 'held') {
      isPrimary = false;
      onLocked();
    }
  };
  channel.postMessage('claim');
  return () => channel.close();
}
