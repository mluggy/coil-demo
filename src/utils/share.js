// Share platform definitions used by EpisodeList and EpisodeDetail.
// Each platform has an Icon, hoverColor, and a getUrl({url, text}) builder.
import { XLogo, LinkedinLogo, FacebookLogo, WhatsappLogo, TelegramLogo, EnvelopeSimple, LinkSimple } from "@phosphor-icons/react";

const enc = encodeURIComponent;

export const SHARE_PLATFORMS = {
  twitter: {
    Icon: XLogo,
    hoverColor: "var(--text)",
    title: "X",
    getUrl: ({ url, text }) => `https://x.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
  },
  linkedin: {
    Icon: LinkedinLogo,
    hoverColor: "#0A66C2",
    title: "LinkedIn",
    getUrl: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  facebook: {
    Icon: FacebookLogo,
    hoverColor: "#1877F2",
    title: "Facebook",
    getUrl: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  whatsapp: {
    Icon: WhatsappLogo,
    hoverColor: "#25D366",
    title: "WhatsApp",
    getUrl: ({ url, text }) => `https://wa.me/?text=${enc(text + " " + url)}`,
  },
  telegram: {
    Icon: TelegramLogo,
    hoverColor: "#26A5E4",
    title: "Telegram",
    getUrl: ({ url, text }) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
  },
  email: {
    Icon: EnvelopeSimple,
    hoverColor: "#8B4513",
    title: "Email",
    getUrl: ({ url, text }) => `mailto:?subject=${enc(text)}&body=${enc(url)}`,
  },
  copy: {
    Icon: LinkSimple,
    hoverColor: "var(--accent)",
    title: "Copy",
    getUrl: null, // copy is handled separately by the caller
  },
};
