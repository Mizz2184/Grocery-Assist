import { createClient } from '@supabase/supabase-js'
// Remove the database.types import since we define it in this file
// import { Database } from './database.types'

// Hardcode the values temporarily for testing
const supabaseUrl = 'https://rcmuzstcirbulftnbcth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbXV6c3RjaXJidWxmdG5iY3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODMxMTUsImV4cCI6MjA1NjQ1OTExNX0.0pg6_Qfawu96RnUft9kEQdqPrLvJk5OQ414jKNF0_Kc';

// Log the values being used
console.log('DIAGNOSTIC: Using Supabase URL:', supabaseUrl);
console.log('DIAGNOSTIC: Using Supabase Key:', supabaseKey ? 'Key is present' : 'Key is missing');

export const supabase = createClient(supabaseUrl, supabaseKey);

// Verify initialization
console.log('DIAGNOSTIC: Supabase client initialized:', !!supabase.from, !!supabase.auth);

// Export auth methods for convenience
export const auth = {
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signUp: async (email: string, password: string, metadata: any) => {
    return await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: metadata } 
    });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getSession: async () => {
    return await supabase.auth.getSession();
  },
  getUser: async () => {
    return await supabase.auth.getUser();
  }
};

export const sendCollaboratorInvite = async (
  userId: string,
  listId: string,
  listName: string,
  collaboratorEmail: string
): Promise<boolean> => {
  try {
    console.log(`Sending invitation email to ${collaboratorEmail} for list ${listName} (${listId})`);
    
    // Create sharing link
    const shareUrl = `${window.location.origin}/shared-list/${listId}`;
    
    // Get current user's details
    let senderName = "Someone";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      senderName = user?.user_metadata?.full_name || user?.email || 'Someone';
      console.log('Sender info:', { userId, senderName });
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Call your edge function directly
    try {
      console.log('Calling email function with payload:', {
        to: collaboratorEmail,
        subject: `${senderName} shared a grocery list with you`,
        templateId: "cm94uidld3tgyttmo1v4gkfdr",
        data: {
          Username: senderName,
          Grocerylist: shareUrl
        }
      });

      const response = await fetch('https://rcmuzstcirbulftnbcth.supabase.co/functions/v1/email-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed if the function is public
        },
        body: JSON.stringify({
          to: collaboratorEmail,
          subject: `${senderName} shared a grocery list with you`,
          templateId: "cm94uidld3tgyttmo1v4gkfdr", // Match the expected parameter name
          data: {
            Username: senderName,
            Grocerylist: shareUrl
          }
        })
      });
      
      const responseData = await response.text();
      console.log('Email function response:', response.status, responseData);
      
      if (!response.ok) {
        throw new Error(`Failed to send email: ${responseData}`);
      }
      
      console.log('Successfully sent invitation email');
      return true;
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      
      // Fallback: Store in database
      console.log('Falling back to database storage');
      try {
        const { error: insertError } = await supabase
          .from('invitations')
          .insert({
            sender_id: userId,
            sender_name: senderName,
            recipient_email: collaboratorEmail,
            list_id: listId,
            list_name: listName,
            share_url: shareUrl,
            created_at: new Date().toISOString(),
            status: 'pending'
          });
          
        if (insertError) {
          console.error('Error storing invitation:', insertError);
          return false;
        }
        
        console.log('Stored invitation in database');
        return true;
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in sendCollaboratorInvite:', error);
    return false;
  }
};

export type Database = {
  public: {
    Tables: {
      invitations: {
        Row: {
          id?: string
          sender_id: string
          sender_name: string
          recipient_email: string
          list_id: string
          list_name: string
          share_url: string
          created_at: string
          status: string
        }
        Insert: {
          sender_id: string
          sender_name: string
          recipient_email: string
          list_id: string
          list_name: string
          share_url: string
          created_at: string
          status: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
