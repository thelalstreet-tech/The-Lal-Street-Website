// client/src/components/OptimizedImage.tsx
import React, { useState, useEffect, useRef, memo } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: string;
  lazy?: boolean;
  aspectRatio?: string;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = 'https://via.placeholder.com/600x300?text=No+Image',
  placeholder,
  lazy = true,
  aspectRatio,
  className = '',
  onError,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    const imgElement = imgRef.current;
    if (!imgElement) return;

    // Use Intersection Observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01,
      }
    );

    observerRef.current.observe(imgElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, lazy]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImageSrc(fallbackSrc);
      setIsLoaded(true);
    }
    onError?.(e);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      className={`relative overflow-hidden ${aspectRatio || ''} ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Placeholder/Blur effect */}
      {!isLoaded && placeholder && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: placeholder ? `url(${placeholder})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
          }}
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc || placeholder || fallbackSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
      />
    </div>
  );
});




