import React from 'react';
import { FreeTacticalMap } from './FreeTacticalMap';

export function LiveMap() {
  return (
    <div className="w-full h-full relative flex flex-col">
      <FreeTacticalMap />
    </div>
  );
}
