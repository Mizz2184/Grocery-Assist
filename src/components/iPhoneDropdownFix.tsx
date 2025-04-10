import { useEffect } from 'react';

/**
 * Component that applies specific fixes for iPhone 11 Pro Max
 * This adds event listeners and CSS overrides specifically for this device
 */
export const IPhoneDropdownFix = () => {
  useEffect(() => {
    // Check if the device is iPhone 11 Pro Max - device width 414px, height 896px
    const isIPhone11ProMax = window.matchMedia(
      'only screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)'
    ).matches;
    
    if (!isIPhone11ProMax) return;
    
    // Add specific fixes for iPhone 11 Pro Max
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      /* Dropdown scroll fixes for iPhone 11 Pro Max */
      body.has-open-dropdown {
        position: fixed;
        width: 100%;
        overflow: hidden;
      }

      /* Content scroll styles */
      [data-radix-popper-content] {
        max-height: 58vh !important;
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        padding-bottom: 80px !important;
      }
      
      /* Sign out button positioning */
      [data-signout-item="true"] {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        padding: 10px !important;
        background-color: var(--popover) !important;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1) !important;
        z-index: 9999 !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Listen for dropdown opening/closing
    const handleDropdownState = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('data-state')) {
        const state = target.getAttribute('data-state');
        if (state === 'open') {
          document.body.classList.add('has-open-dropdown');
        } else {
          document.body.classList.remove('has-open-dropdown');
        }
      }
    };
    
    document.addEventListener('click', handleDropdownState, true);
    
    return () => {
      document.head.removeChild(styleEl);
      document.removeEventListener('click', handleDropdownState, true);
      document.body.classList.remove('has-open-dropdown');
    };
  }, []);
  
  return null;
};

export default IPhoneDropdownFix; 