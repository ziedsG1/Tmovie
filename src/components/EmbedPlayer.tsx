"use client";

interface EmbedPlayerProps {
  src: string;
  title: string;
}

/** Sandboxed iframe — popups blocked (allow-popups not set). */
export function EmbedPlayer({ src, title }: EmbedPlayerProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-surface-border">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
}
