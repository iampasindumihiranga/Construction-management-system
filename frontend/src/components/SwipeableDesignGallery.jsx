import { useState, useRef } from 'react';

export default function SwipeableDesignGallery({ images = [], title = 'Property' }) {
  const validImages = Array.isArray(images) && images.filter(Boolean).length > 0
    ? images.filter(Boolean)
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile/tablet swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) {
      // Swiped left -> show next image (sliding right)
      nextSlide();
    } else if (diff < -40) {
      // Swiped right -> show previous image
      prevSlide();
    }
  };

  // Mouse drag handlers for desktop swipe
  const handleMouseDown = (e) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  return (
    <div className="swipeable-gallery-root" style={{ width: '100%', userSelect: 'none' }}>
      {/* Slider Viewport */}
      <div
        className="swipeable-gallery-viewport"
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#091e17',
          cursor: validImages.length > 1 ? 'grab' : 'default',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Sliding Track */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {validImages.map((src, idx) => (
            <div
              key={idx}
              style={{
                minWidth: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
              }}
            >
              <img
                src={src}
                alt={`${title} - Photo ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Counter & Hint Pill */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 3,
          }}
        >
          
          <span>{currentIndex + 1} / {validImages.length}</span>
        </div>

        {/* Swipe Hint overlay when multiple images exist */}
        {validImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(5, 150, 105, 0.88)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              zIndex: 3,
              letterSpacing: '0.02em',
            }}
          >
            Swipe right or click to view images
          </div>
        )}

        {/* Navigation Arrow: Left (Previous) */}
        {validImages.length > 1 && (
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '12px',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.88)',
              color: '#0f172a',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              cursor: 'pointer',
              zIndex: 4,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ‹
          </button>
        )}

        {/* Navigation Arrow: Right (Next) - "Swipe to right side" */}
        {validImages.length > 1 && (
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            style={{
              position: 'absolute',
              top: '50%',
              right: '12px',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.88)',
              color: '#0f172a',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              cursor: 'pointer',
              zIndex: 4,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ›
          </button>
        )}

        {/* Bottom Pagination Dots */}
        {validImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '6px',
              zIndex: 3,
              background: 'rgba(0, 0, 0, 0.45)',
              padding: '4px 8px',
              borderRadius: '12px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                style={{
                  width: currentIndex === idx ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: currentIndex === idx ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails Strip */}
      {validImages.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          {validImages.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '68px',
                height: '52px',
                borderRadius: '8px',
                overflow: 'hidden',
                padding: 0,
                border: currentIndex === idx ? '2.5px solid #059669' : '1px solid #cbd5e1',
                boxShadow: currentIndex === idx ? '0 0 0 2px rgba(5, 150, 105, 0.3)' : 'none',
                opacity: currentIndex === idx ? 1 : 0.6,
                cursor: 'pointer',
                flexShrink: 0,
                background: '#000',
                transition: 'all 0.2s ease',
              }}
            >
              <img
                src={src}
                alt={`Thumbnail ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
