import { supabase } from '../supabase/client';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  SUPER_ADMIN = 'super_admin'
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export class RoleService {
  // Define your developer emails here
  private static readonly DEVELOPER_EMAILS = [
    'marcminott@gmail.com', // Your email
    // Add more developer emails as needed
  ];

  /**
   * Check if current user has developer access
   */
  static async hasDeveloperAccess(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        return false;
      }

      // Check if user email is in developer list
      const isDeveloper = this.DEVELOPER_EMAILS.includes(user.email.toLowerCase());
      
      // Also check database role if you have a profiles table
      if (isDeveloper) {
        return true;
      }

      // Check database for role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      return profile?.role === UserRole.DEVELOPER || 
             profile?.role === UserRole.SUPER_ADMIN;
    } catch (error) {
      console.error('Error checking developer access:', error);
      return false;
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(permission: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      // Developer emails have all permissions
      if (this.DEVELOPER_EMAILS.includes(user.email?.toLowerCase() || '')) {
        return true;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', user.id)
        .single();

      if (!profile) return false;

      // Super admin has all permissions
      if (profile.role === UserRole.SUPER_ADMIN) {
        return true;
      }

      // Check specific permissions
      return profile.permissions?.includes(permission) || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get current user's role
   */
  static async getCurrentUserRole(): Promise<UserRole> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        return UserRole.USER;
      }

      // Check if user email is in developer list
      if (this.DEVELOPER_EMAILS.includes(user.email.toLowerCase())) {
        return UserRole.DEVELOPER;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      return (profile?.role as UserRole) || UserRole.USER;
    } catch (error) {
      console.error('Error getting user role:', error);
      return UserRole.USER;
    }
  }

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      const hasPermission = await this.hasPermission('manage_users');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update user role');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  /**
   * Check if current user is authenticated and authorized for action
   */
  static async requireDeveloperAccess(): Promise<void> {
    const hasAccess = await this.hasDeveloperAccess();
    if (!hasAccess) {
      throw new Error('Developer access required');
    }
  }

  /**
   * Get all available permissions based on role
   */
  static getPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return [
          'manage_users',
          'access_developer_tools',
          'manage_system_settings',
          'view_analytics',
          'export_data',
          'manage_content'
        ];
      case UserRole.DEVELOPER:
        return [
          'access_developer_tools',
          'view_analytics',
          'export_data'
        ];
      case UserRole.ADMIN:
        return [
          'manage_content',
          'view_analytics'
        ];
      case UserRole.USER:
      default:
        return [];
    }
  }
}