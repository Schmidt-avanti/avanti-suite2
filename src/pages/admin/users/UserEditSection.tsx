
import React from "react";
import UserEditDialog from "./UserEditDialog";
import { User, Customer } from "@/types";

interface UserEditSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: User & { customers: Customer[]; is_active: boolean; name: string }) => void;
  customers?: Customer[];
  defaultValues?: (User & { customers: Customer[], is_active: boolean });
}

// Kundenprop ist obsolet, greift darauf nicht mehr zu!
const UserEditSection: React.FC<UserEditSectionProps> = ({
  open,
  onOpenChange,
  onSave,
  defaultValues,
}) => {
  return (
    <UserEditDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      defaultValues={defaultValues}
    />
  );
};

export default UserEditSection;
