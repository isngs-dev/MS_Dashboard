/**
 * iSN chatbot widget configuration.
 *
 * Equivalent of the embed snippet:
 *   <script src="https://chat.isngs.com/widget.js"
 *           data-client-key="pk_..." data-api-base="https://..."></script>
 *
 * The client key is a *publishable* key (pk_...): it is meant to be visible in the page
 * source, so it is fine to keep it in client code. The widget only talks to `apiBase`.
 *
 * Optional widget attributes (add them in `src/components/ui/Chatbot.tsx`):
 *   data-position="left"   launcher on the left instead of the right
 *   data-mount="#selector" render inline inside an element instead of a floating launcher
 *   data-debug="true"      verbose console logging
 */
export const CHATBOT = {
  src: "https://chat.isngs.com/widget.js",
  clientKey: "pk_dN0WAKL_jnPnjdvOyPESEt7Xu7HULXEP",
  apiBase: "https://159-89-230-107.nip.io",
} as const;
