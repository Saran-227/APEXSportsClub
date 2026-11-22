/**
 * ApexSportsClub - Razorpay Standard Checkout SDK Loader & Execution Utility
 */

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (result: RazorpayPaymentResult) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Dynamically load the official Razorpay Checkout SDK script tag
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Launch the native Razorpay Checkout popup modal with Apex Sports branding
 */
export const openRazorpayModal = async (
  options: RazorpayCheckoutOptions
): Promise<void> => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    if (options.onError) {
      options.onError(new Error('Razorpay Checkout SDK is unavailable or blocked by browser.'));
    } else {
      alert('Razorpay Checkout SDK is unavailable. Please check your internet connection.');
    }
    return;
  }

  const razorpayOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'Apex Sports Club',
    description: options.description || 'Payment Settlement',
    image: options.image || '/assets/logo.png',
    order_id: options.orderId,
    prefill: {
      name: options.prefill?.name || '',
      email: options.prefill?.email || '',
      contact: options.prefill?.contact || '',
    },
    notes: options.notes || {},
    theme: {
      color: options.themeColor || '#083222',
      backdrop_color: 'rgba(0, 0, 0, 0.75)',
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      backdropclose: false,
      escape: true,
      handleback: true,
      confirm_close: true,
    },
    handler: (response: RazorpayPaymentResult) => {
      options.onSuccess(response);
    },
  };

  try {
    const rzpInstance = new window.Razorpay(razorpayOptions);
    rzpInstance.on('payment.failed', (response: any) => {
      if (options.onError) {
        options.onError(response.error);
      }
    });
    rzpInstance.open();
  } catch (err) {
    console.error('Error opening Razorpay checkout modal:', err);
    if (options.onError) options.onError(err);
  }
};
