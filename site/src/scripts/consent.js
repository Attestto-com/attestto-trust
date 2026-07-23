// Consent-gated Google Analytics (GA4) for the trust directory.
// Mirrors attestto-verify's <attestto-consent>: analytics load ONLY after the
// visitor accepts; the choice is persisted in localStorage under the same key
// so the banner appears once. IP anonymization is on and no personal data is
// collected. Progressive enhancement — nothing loads without an explicit accept.
const GA_ID = 'G-JCE4RZ8CCC';
const STORAGE_KEY = 'attestto-consent';

const COPY = {
  en: {
    text: 'We use anonymous analytics to understand how this directory is used. No personal data is collected.',
    accept: 'Accept',
    decline: 'Decline',
    aria: 'Analytics consent',
  },
  es: {
    text: 'Usamos analítica anónima para entender cómo se usa este directorio. No se recogen datos personales.',
    accept: 'Aceptar',
    decline: 'Rechazar',
    aria: 'Consentimiento de analítica',
  },
};

function loadGA() {
  if (document.querySelector('script[src*="googletagmanager"]')) return;
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(tag);

  const inline = document.createElement('script');
  inline.textContent =
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
    "gtag('js',new Date());" +
    `gtag('config','${GA_ID}',{anonymize_ip:true});`;
  document.head.appendChild(inline);
}

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage blocked; consent lives for this page view only */
  }
}

function showBanner() {
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const t = COPY[lang];

  // Built with DOM methods (not innerHTML) — all copy is static, but this keeps
  // the banner injection trivially XSS-free.
  const banner = document.createElement('div');
  banner.className = 'consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', t.aria);

  const text = document.createElement('p');
  text.className = 'consent-banner__text';
  text.textContent = t.text;

  const actions = document.createElement('div');
  actions.className = 'consent-banner__actions';

  const decline = document.createElement('button');
  decline.type = 'button';
  decline.className = 'consent-banner__btn consent-banner__btn--decline';
  decline.textContent = t.decline;

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'consent-banner__btn consent-banner__btn--accept';
  accept.textContent = t.accept;

  actions.append(decline, accept);
  banner.append(text, actions);
  document.body.appendChild(banner);

  accept.addEventListener('click', () => {
    writeConsent('accepted');
    banner.remove();
    loadGA();
  });
  decline.addEventListener('click', () => {
    writeConsent('rejected');
    banner.remove();
  });
}

export function initConsent() {
  const stored = readConsent();
  if (stored === 'accepted') loadGA();
  else if (stored !== 'rejected') showBanner();
}
