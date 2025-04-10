import { supabase } from '@/lib/supabase';

// User payment status constants
export const PAYMENT_STATUS = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  PAID: 'PAID'
};

// Set this to false to ensure we don't use localStorage
let useLocalStorageFallback = false;

/**
 * Attempts to create user_payments table if it doesn't exist
 */
export const ensureUserPaymentsTable = async (): Promise<boolean> => {
  try {
    console.log('Checking if user_payments table exists');
    
    // First check if we have admin privileges
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.warn('No active session, cannot create table');
      return false;
    }
    
    // Try to create the table with simple structure if it doesn't exist
    const { error } = await supabase.rpc('create_user_payments_if_not_exists');
    
    if (error) {
      console.error('Error creating user_payments table:', error);
      return false;
    }
    
    console.log('User payments table is ready');
    return true;
  } catch (error) {
    console.error('Failed to ensure user_payments table exists:', error);
    return false;
  }
};

/**
 * Creates or updates a user payment record in the database
 */
export const createUserPaymentRecord = async (userId: string, status: string = PAYMENT_STATUS.NONE): Promise<boolean> => {
  try {
    console.log(`Attempting to create/update payment record for user: ${userId} with status: ${status}`);
    
    // First, check if the user has a session (required for RLS policies)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.warn('No active session found, cannot update user payment record');
      // Simply return success even when no session - this allows sign-up flow to continue
      return true;
    }

    // Check if record already exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('user_payments')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If table doesn't exist yet, create it using direct SQL
    if (checkError) {
      console.error('Error checking for existing record:', checkError);
      
      if (checkError.code === '42P01') {
        // Table doesn't exist - try to create it
        try {
          const { error: tableError } = await supabase.rpc('create_user_payments_if_not_exists');
          if (tableError) {
            console.error('Failed to create user_payments table:', tableError);
            return false;
          }
        } catch (err) {
          console.error('Error creating table:', err);
          return false;
        }
      }
      
      // For RLS errors, try to use service role if available
      if (checkError.code === '42501' || checkError.code === '401') {
        console.warn('Permission issue with user_payments table');
        return false;
      }
    }
    
    if (existingRecord) {
      console.log('Updating existing payment record');
      // Update existing record
      const { error } = await supabase
        .from('user_payments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating user payment record:', error);
        return false;
      }
    } else {
      console.log('Creating new payment record');
      // Create new record - convert userId to UUID if needed
      const { error } = await supabase
        .from('user_payments')
        .insert([{ 
          user_id: userId, 
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Error creating user payment record:', error);
        return false;
      }
    }
    
    console.log(`Successfully set user ${userId} payment status to ${status}`);
    return true;
  } catch (error) {
    console.error('Error in createUserPaymentRecord:', error);
    return false;
  }
};

/**
 * Sets a user's payment status to pending
 */
export const setUserPaymentPending = async (userId: string, sessionId: string): Promise<boolean> => {
  try {
    return await createUserPaymentRecord(userId, PAYMENT_STATUS.PENDING);
  } catch (error) {
    console.error('Error updating user payment status to pending:', error);
    return false;
  }
};

/**
 * Marks a user as having paid
 */
export const setUserPaid = async (userId: string): Promise<boolean> => {
  try {
    return await createUserPaymentRecord(userId, PAYMENT_STATUS.PAID);
  } catch (error) {
    console.error('Error updating user payment status to paid:', error);
    return false;
  }
};

/**
 * Checks if a user has paid
 */
export const checkUserPaymentStatus = async (userId: string): Promise<boolean> => {
  try {
    // Check for network connectivity first
    if (!navigator.onLine) {
      console.warn('No internet connection detected - using offline mode');
      return false; // Assume not paid in offline mode
    }

    const { data, error } = await supabase
      .from('user_payments')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking user payment status:', error);
      // For network errors, don't block the user
      if (error.message && error.message.includes('Failed to fetch')) {
        console.warn('Network error detected - using offline mode');
        return false; // Allow access in case of network errors
      }
      return false;
    }

    return data?.status === PAYMENT_STATUS.PAID;
  } catch (error) {
    console.error('Error checking user payment status:', error);
    // For network errors, don't block the user
    if (error instanceof Error && error.message.includes('fetch')) {
      console.warn('Network error caught - using offline mode');
      return false; // Allow access in case of network errors
    }
    return false;
  }
};

/**
 * Gets the current session ID for a pending payment
 */
export const getPaymentSessionId = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_payments')
      .select('session_id')
      .eq('user_id', userId)
      .eq('status', PAYMENT_STATUS.PENDING)
      .maybeSingle();

    if (error) {
      // Only log real errors, not "no rows found"
      if (error.code !== 'PGRST116') {
        console.error('Error getting payment session ID:', error);
      }
      return null;
    }

    return data?.session_id || null;
  } catch (error) {
    console.error('Error getting payment session ID:', error);
    return null;
  }
};

/**
 * Marks a user as a new user that needs to complete payment
 */
export const markUserAsNew = async (userId: string): Promise<boolean> => {
  console.log(`Marking user ${userId} as new`);
  return createUserPaymentRecord(userId, PAYMENT_STATUS.NONE);
};

/**
 * Checks if a user is new (has no payment status)
 */
export const isNewUser = async (userId: string): Promise<boolean> => {
  try {
    // First, check if the user has a session (required for RLS policies)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.warn('No active session found, cannot check if user is new');
      // Default to false if no session
      return false;
    }
    
    const { data, error } = await supabase
      .from('user_payments')
      .select('status')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Code for 'no rows returned'
        // No record means new user
        return true;
      }
      console.error('Error checking if user is new:', error);
      return false;
    }
    
    // User is new if they have no payment record or status is NONE
    return !data || data.status === PAYMENT_STATUS.NONE;
  } catch (error) {
    console.error('Error in isNewUser:', error);
    return false;
  }
};

export const manuallyConfirmEmail = async (userId: string, adminPassword: string): Promise<boolean> => {
  try {
    if (adminPassword !== import.meta.env.VITE_ADMIN_PASSWORD) {
      console.error('Invalid admin password');
      return false;
    }
    
    // ... rest of the function ...
  } catch (error) {
    // ... error handling ...
  }
};

export const directVerifyUser = async (email: string, adminPassword: string): Promise<boolean> => {
  try {
    if (adminPassword !== import.meta.env.VITE_ADMIN_PASSWORD) {
      console.error('Invalid admin password');
      return false;
    }
    
    // ... rest of the function ...
  } catch (error) {
    // ... error handling ...
  }
};

// Call this function to check/create the table when the module loads
ensureUserPaymentsTable()
  .then(success => {
    if (success) {
      console.log('User payments system initialized');
    } else {
      console.warn('Using localStorage for user payments as fallback');
      useLocalStorageFallback = true;
    }
  })
  .catch(() => {
    useLocalStorageFallback = true;
  }); 