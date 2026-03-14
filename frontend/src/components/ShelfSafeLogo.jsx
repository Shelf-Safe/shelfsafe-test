import React from 'react';
import logoBig from '../assets/shelfsafe-big.svg';
import logoSmall from '../assets/shelfsafe-small.png.svg';

export function ShelfSafeLogo({ className = '' }) {
  return (
    <div className={className} aria-label="ShelfSafe">
      <img src={logoBig} alt="ShelfSafe" className="hidden sm:block h-16 md:h-20 w-auto" draggable={false} />
      <img src={logoSmall} alt="ShelfSafe" className="block sm:hidden h-14 w-auto" draggable={false} />
    </div>
  );
}
