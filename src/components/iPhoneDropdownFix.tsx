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
    
    // Check if any iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                 
    if (!isIOS && !isIPhone11ProMax) return;
    
    // Add specific fixes for iOS devices
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      /* Prevent background content from scrolling when dropdown is open */
      body.has-open-dropdown {
        position: fixed;
        width: 100%;
        overflow: hidden;
      }

      /* Dropdown content styles with proper scrolling */
      [data-radix-popper-content] {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        padding-bottom: 100px !important; /* Add padding for the sign out button */
        max-height: 75vh !important;
      }
      
      /* Make dropdown wrapper taller */
      [data-radix-popper-content-wrapper] {
        max-height: 80vh !important;
      }
      
      /* Fix signout button positioning - keeping it in the scroll flow but visible */
      [data-signout-item="true"] {
        position: sticky !important;
        bottom: 0 !important;
        background-color: var(--popover) !important;
        box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1) !important;
        margin-top: 16px !important;
        padding: 8px !important;
        z-index: 50 !important;
      }
      
      /* Ensure mobile currency converter doesn't get hidden */
      .mobile-dropdown-content {
        padding-bottom: 80px !important;
      }

      /* Additional fixes for iPhone 11 Pro Max */
      @media only screen 
        and (device-width: 414px) 
        and (device-height: 896px) 
        and (-webkit-device-pixel-ratio: 3) {
        [data-radix-popper-content] {
          max-height: 70vh !important;
        }
        
        /* Ensure mobile menu has proper padding */
        .mobile-menu-overlay .flex-col {
          padding-bottom: 100px !important;
        }
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