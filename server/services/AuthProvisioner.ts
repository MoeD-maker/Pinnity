// @ts-nocheck
/**
 * Supabase Auth user provisioning service
 * Handles email confirmation based on phone verification status
 */

export interface ProvisionResult {
  userId: string;
  email_confirmed: boolean;
}

export interface ProvisionInput {
  email: string;
  password: string;
  phone?: string;
  phoneVerified: boolean;
}

export async function provisionSupabaseUser({
  email: rawEmail,
  password,
  phone,
  phoneVerified
}: ProvisionInput): Promise<ProvisionResult> {
  // Normalize email
  const email = rawEmail.trim().toLowerCase();
  
  // Create admin client with SERVICE_ROLE key
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Find existing user by email
  const { data: userList, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200
  });
  
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }
  
  const existingUser = userList.users.find(u => 
    (u.email || '').toLowerCase() === email
  );
  
  // Decide email confirmation flag
  const mode = process.env.EMAIL_CONFIRM_MODE || 'auto_on_phone_verify';
  const email_confirm = 
    mode === 'auto_always' ? true :
    mode === 'auto_on_phone_verify' ? !!phoneVerified :
    false; // 'link'
  
  let userId: string;
  let finalConfirmState: boolean;
  
  if (!existingUser) {
    // Create new user
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm,
      phone: phone || undefined,
      phone_confirm: false
    });
    
    if (createError || !newUser.user) {
      throw new Error(`Failed to create user: ${createError?.message}`);
    }
    
    userId = newUser.user.id;
    finalConfirmState = email_confirm;
    
  } else {
    userId = existingUser.id;
    
    // Update existing user if needed
    const updates: any = {};
    
    // Confirm email if mode allows it
    if (mode !== 'link' && email_confirm === true) {
      updates.email_confirm = true;
    }
    
    // Update password if provided
    if (password) {
      updates.password = password;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        userId,
        updates
      );
      
      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
    }
    
    finalConfirmState = email_confirm || existingUser.email_confirmed_at !== null;
  }
  
  return {
    userId,
    email_confirmed: finalConfirmState
  };
}