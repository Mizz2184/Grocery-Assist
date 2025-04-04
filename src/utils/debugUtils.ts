import { supabase } from '@/lib/supabase';

/**
 * Debug utility to help diagnose collaborator access issues
 */
export const diagnoseSharedList = async (listId: string, userEmail?: string) => {
  console.group('🔍 SHARED LIST ACCESS DIAGNOSIS');
  
  try {
    console.log(`📋 Diagnosing access for list: ${listId}`);
    
    // First check if list exists
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();
      
    if (listError) {
      console.error('❌ List not found:', listError.message);
      console.groupEnd();
      return {
        success: false,
        error: 'List not found',
        details: listError
      };
    }
    
    console.log('✅ List found:', {
      id: list.id,
      name: list.name,
      ownerId: list.user_id,
      collaboratorCount: Array.isArray(list.collaborators) ? list.collaborators.length : 'N/A',
    });
    
    // Check collaborators array structure
    if (!list.collaborators) {
      console.log('⚠️ Collaborators array is empty or undefined');
    } else if (!Array.isArray(list.collaborators)) {
      console.error('❌ Collaborators is not an array:', typeof list.collaborators);
    } else {
      // Log all collaborators
      console.log('📧 Collaborators array:', list.collaborators);
      
      // Show cleaned collaborator list
      const cleanedCollaborators = list.collaborators
        .filter(c => c !== null && c !== undefined && c !== '')
        .map(c => String(c).toLowerCase().trim());
        
      console.log('🧹 Cleaned collaborators:', cleanedCollaborators);
      
      // If email provided, check if they should have access
      if (userEmail) {
        const normalizedEmail = userEmail.toLowerCase().trim();
        const hasAccess = cleanedCollaborators.includes(normalizedEmail);
        
        console.log(`🔐 Access check for ${normalizedEmail}: ${hasAccess ? 'Has access' : 'No access'}`);
        
        // Try from database perspective
        try {
          const { data: dbCheck, error } = await supabase
            .from('grocery_lists')
            .select('id')
            .eq('id', listId)
            .filter('collaborators', 'cs', `{${normalizedEmail}}`)
            .single();
          
          console.log(`🔐 DB filter check for ${normalizedEmail}: ${dbCheck ? 'Found' : 'Not found'}`);
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
      .single();
      
    if (listError) {
      console.error('❌ List not found:', listError.message);
      console.groupEnd();
      return {
        success: false,
        error: 'List not found',
        details: listError
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
    
    console.log('🧹 Original collaborators:', list.collaborators);
    console.log('🧹 Cleaned collaborators:', cleanedCollaborators);
    
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
    
    console.log('✅ Collaborator array fixed!');
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