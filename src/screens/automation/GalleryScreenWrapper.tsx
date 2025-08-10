import React from 'react';
import GalleryScreenFixed from './GalleryScreenFixed';

// Wrapper to ensure proper component initialization
const GalleryScreenWrapper: React.FC<any> = (props) => {
  return <GalleryScreenFixed {...props} />;
};

export default GalleryScreenWrapper;