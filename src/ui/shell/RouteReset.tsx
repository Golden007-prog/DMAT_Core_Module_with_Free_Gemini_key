import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** On navigation: scroll to top and move focus to the main region so screen
 *  readers and keyboard users land at the new content. */
export default function RouteReset({ mainId }: { mainId: string }) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const main = document.getElementById(mainId);
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }, [pathname, mainId]);
  return null;
}
