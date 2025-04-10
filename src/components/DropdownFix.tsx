import { useEffect } from 'react';

/**
 * Component that applies iOS-specific fixes to enable proper dropdown scrolling
 * This is used to inject global CSS rules on mount
 */
export const DropdownFix = () => {
  useEffect(() => {
    // Check if the device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (!isIOS) return;
    
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      /* Fixes for iOS dropdown scrolling */
      [data-radix-popper-content-wrapper] {
        max-height: 80vh !important;
        overflow: visible !important;
      }
      
      [data-radix-popper-content] {
        -webkit-overflow-scrolling: touch !important;
        overflow-y: scroll !important;
        max-height: 65vh !important;
        padding-bottom: 30px !important;
      }
      
      /* Specific iPhone 11 Pro Max fix */
      @media only screen 
        and (device-width: 414px) 
        and (device-height: 896px) 
        and (-webkit-device-pixel-ratio: 3) {
        [data-radix-popper-content] {
          max-height: 55vh !important;
        }
      }
    `;
    
    // Append the style element to the head
    document.head.appendChild(styleEl);
    
    // Cleanup
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default DropdownFix; 