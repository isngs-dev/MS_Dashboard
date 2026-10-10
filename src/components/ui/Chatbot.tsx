import Script from "next/script";
import { CHATBOT } from "@/lib/chatbot";

/**
 * Loads the iSN chatbot widget on every page.
 *
 * `lazyOnload` waits until the browser is idle after the page has loaded: the widget
 * is a ~1.5 MB bundle (it ships its own React), so it must never compete with the
 * hero animation or the first paint. The widget finds its settings from the
 * data-* attributes of this very <script> element, which next/script copies over.
 */
export default function Chatbot() {
  return (
    <Script
      id="isn-chatbot-widget"
      src={CHATBOT.src}
      strategy="lazyOnload"
      data-client-key={CHATBOT.clientKey}
      data-api-base={CHATBOT.apiBase}
    />
  );
}
