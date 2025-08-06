import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { DEVELOPER_EMAILS, USER_ROLES, UserRole } from '../constants/roles';
import { useEffect, useState } from 'react';
import { RoleService } from '../services/auth/RoleService';
import { EventLogger } from '../utils/EventLogger';

export const useUserRole = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [role, setRole] = useState<UserRole>(USER_ROLES.USER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!isAuthenticated || !user) {
        setRole(USER_ROLES.USER);
        setIsLoading(false);
        return;
      }

      try {
        // Quick check for developer emails
        if (DEVELOPER_EMAILS.includes(user.email.toLowerCase())) {
          setRole(USER_ROLES.DEVELOPER);
          setIsLoading(false);
          return;
        }

        // Check with RoleService for database role
        const userRole = await RoleService.getCurrentUserRole();
        setRole(userRole as UserRole);
      } catch (error) {
        EventLogger.error('useUserRole', 'Error checking user role:', error as Error);
        setRole(USER_ROLES.USER);
      } finally {
        setIsLoading(false);
      }
    };

    checkRole();
  }, [user, isAuthenticated]);

  const isDeveloper = role === USER_ROLES.DEVELOPER || role === USER_ROLES.SUPER_ADMIN;
  const isAdmin = role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
  const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN;

  return {
    role,
    isDeveloper,
    isAdmin,
    isSuperAdmin,
    isLoading,
    userEmail: user?.email || ''
  };
};