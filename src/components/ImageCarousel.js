import React, { useState } from "react";

export default function ImageCarousel({ images, name }) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) {
    return <div className="image-carousel-placeholder" />;
  }

  return (
    <div className="image-carousel">
      <img
        src={images[index]}
        alt={`${name} ${index + 1}`}
        className="image-carousel-main"
      />
      {images.length > 1 && (
        <div className="image-carousel-dots">
          {images.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
