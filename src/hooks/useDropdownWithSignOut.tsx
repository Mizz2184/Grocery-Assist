import { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutDropdownMenuItem } from '@/components/SignOutDropdownMenuItem';
import { useAuth } from '@/hooks/useAuth';

interface UseDropdownWithSignOutProps {
  showSignOut?: boolean;
  onSignOut?: () => void;
}

export const useDropdownWithSignOut = (props: UseDropdownWithSignOutProps = {}) => {
  const { showSignOut = true, onSignOut } = props;
  const { user } = useAuth();
  
  const DropdownWithSignOut = ({
    children,
    trigger,
    ...menuProps
  }: {
    children: ReactNode;
    trigger: ReactNode;
    [key: string]: any;
  }) => (
    <DropdownMenu {...menuProps}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[220px]">
        {children}
        {showSignOut && user && <SignOutDropdownMenuItem onSignOut={onSignOut} />}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return { DropdownWithSignOut };
}; 