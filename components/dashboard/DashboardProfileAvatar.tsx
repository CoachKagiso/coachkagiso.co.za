'use client';

import { useEffect, useState } from 'react';

const fallbackProfilePhoto = '/images/author/ck-profile.png';

export default function DashboardProfileAvatar({
  src,
  alt = 'Kagiso',
  className = 'h-9 w-9 rounded-full object-cover',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);

  useEffect(() => {
    function handleProfilePhotoUpdate(event: Event) {
      const detail = (event as CustomEvent<{ profilePhotoUrl?: string }>).detail;
      if (detail?.profilePhotoUrl) {
        setFallbackActive(false);
        setOverrideSrc(detail.profilePhotoUrl);
      }
    }

    window.addEventListener('coach-profile-photo-updated', handleProfilePhotoUpdate);
    return () => window.removeEventListener('coach-profile-photo-updated', handleProfilePhotoUpdate);
  }, []);

  const currentSrc = fallbackActive ? fallbackProfilePhoto : overrideSrc || src || fallbackProfilePhoto;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setFallbackActive(true)}
    />
  );
}
