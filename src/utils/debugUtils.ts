import { supabase } from '@/lib/supabase';

/**
 * Debug utility to help diagnose collaborator access issues
 */
export const diagnoseSharedList = async (listId: string, userEmail?: string) => {
  console.group('🔍 SHARED LIST ACCESS DIAGNOSIS');
  
  try {

    // First check if list exists
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .maybeSingle();
      
    if (listError) {
      console.error('❌ Database error:', listError.message);
      console.groupEnd();
      return {
        success: false,
        error: 'Database error',
        details: listError
      };
    }
    
    if (!list) {
      console.error('❌ List not found - ID:', listId);
      console.groupEnd();
      return {
        success: false,
        error: 'List not found',
        details: 'No matching list found in the database'
      };
    }

    // Check collaborators array structure
    if (!list.collaborators) {

    } else if (!Array.isArray(list.collaborators)) {
      console.error('❌ Collaborators is not an array:', typeof list.collaborators);
    } else {
      // Log all collaborators

      // Show cleaned collaborator list
      const cleanedCollaborators = list.collaborators
        .filter(c => c !== null && c !== undefined && c !== '')
        .map(c => String(c).toLowerCase().trim());

      // If email provided, check if they should have access
      if (userEmail) {
        const normalizedEmail = userEmail.toLowerCase().trim();
        const hasAccess = cleanedCollaborators.includes(normalizedEmail);

        // Try from database perspective
        try {
          const { data: dbCheck, error } = await supabase
            .from('grocery_lists')
            .select('id')
            .eq('id', listId)
            .filter('collaborators', 'cs', `{${normalizedEmail}}`)
            .single();

          if (error) {
            console.error('Filter error:', error);
          }
        } catch (dbError) {
          console.error('❌ DB check failed:', dbError);
        }
      }
    }
    
    console.groupEnd();
    return {
      success: true,
      list,
      collaborators: list.collaborators
    };
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    console.groupEnd();
    return {
      success: false,
      error: 'Diagnosis failed',
      details: error
    };
  }
};

/**
 * Fix invalid collaborator arrays in the database
 */
export const fixCollaboratorArray = async (listId: string) => {
  console.group('🔧 FIX COLLABORATOR ARRAY');
  
  try {
    // Get current list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('collaborators, user_id')
      .eq('id', listId)
      .maybeSingle();
      
    if (listError) {
      console.error('❌ Database error:', listError.message);
      console.groupEnd();
      return {
        success: false,
        error: 'Database error',
        details: listError
      };
    }
    
    if (!list) {
      console.error('❌ List not found:', listId);
      console.groupEnd();
      return {
        success: false,
        error: 'List not found',
        details: 'No list with this ID exists in the database'
      };
    }
    
    // Check if user is authenticated
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      console.error('❌ Not authenticated');
      console.groupEnd();
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
    
    // Check if user is owner
    if (authData.user.id !== list.user_id) {
      console.error('❌ Not the list owner');
      console.groupEnd();
      return {
        success: false,
        error: 'Not the list owner'
      };
    }
    
    // Clean collaborators array
    let cleanedCollaborators: string[] = [];
    
    if (Array.isArray(list.collaborators)) {
      cleanedCollaborators = list.collaborators
        .filter(c => c !== null && c !== undefined && c !== '')
        .map(c => String(c).toLowerCase().trim());
    }

    // Update list with cleaned array
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ collaborators: cleanedCollaborators })
      .eq('id', listId);
      
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      console.groupEnd();
      return {
        success: false,
        error: 'Update failed',
        details: updateError
      };
    }

    console.groupEnd();
    return {
      success: true,
      collaborators: cleanedCollaborators
    };
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.groupEnd();
    return {
      success: false,
      error: 'Fix failed',
      details: error
    };
  }
}; 