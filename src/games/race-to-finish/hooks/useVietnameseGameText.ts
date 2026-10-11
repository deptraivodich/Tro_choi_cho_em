import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';

// Expo's default web shell declares English. Preserve Vietnamese/math text,
// including Modal portals outside the screen's own DOM subtree.
export function useVietnameseGameText() {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    const oldLang = root.getAttribute('lang'), oldTranslate = root.getAttribute('translate');
    const hadClass = root.classList.contains('notranslate');
    root.setAttribute('lang', 'vi'); root.setAttribute('translate', 'no'); root.classList.add('notranslate');
    const existingMeta = document.querySelector('meta[name="google"][content="notranslate"]');
    const meta = existingMeta ?? document.createElement('meta');
    if (!existingMeta) {
      meta.setAttribute('name', 'google'); meta.setAttribute('content', 'notranslate'); document.head.appendChild(meta);
    }
    return () => {
      if (oldLang === null) root.removeAttribute('lang'); else root.setAttribute('lang', oldLang);
      if (oldTranslate === null) root.removeAttribute('translate'); else root.setAttribute('translate', oldTranslate);
      if (!hadClass) root.classList.remove('notranslate');
      if (!existingMeta) meta.remove();
    };
  }, []);
}
