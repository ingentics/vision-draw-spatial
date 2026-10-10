# Police d'un mode fournie par l'appli

> Dette vue à l'audit 500 (reprise de 476) — tronc, appli

- `'Permanent Marker'` est écrit dans l'appli (`src/app/fonts.ts:23`) et dans le mode (`stickyLayout.ts:14`), liés
  par la seule chaîne ; une faute de frappe retombe sans bruit en Roboto (`pickFontKey`). Un mode ne peut pas livrer
  sa police, et aucun test ne vérifie que l'appli fournit celles que demandent les modes.
