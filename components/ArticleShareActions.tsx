'use client';

import { useState } from 'react';
import { Check, Facebook, Linkedin, Link2, Mail } from 'lucide-react';

type ArticleShareActionsProps = {
  articleUrl: string;
  title: string;
};

export default function ArticleShareActions({
  articleUrl,
  title,
}: ArticleShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const mailSubject = encodeURIComponent(title);
  const mailBody = encodeURIComponent(`I thought you might like this article: ${articleUrl}`);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const actionClassName =
    'h-10 w-10 rounded-full border border-[#142334]/20 flex items-center justify-center hover:bg-[#142334] hover:text-white transition';

  return (
    <div className="flex items-center gap-4 lg:justify-end">
      <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#A09086]">
        Share
      </p>
      <div className="flex items-center gap-3">
        <a
          href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
          aria-label="Share by email"
          className={actionClassName}
        >
          <Mail className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={copied ? 'Link copied' : 'Copy article link'}
          title={copied ? 'Link copied' : 'Copy link'}
          className={`${actionClassName} ${copied ? 'bg-[#142334] text-white' : ''}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </button>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className={actionClassName}
        >
          <Linkedin className="h-4 w-4" />
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className={actionClassName}
        >
          <Facebook className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
