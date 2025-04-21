
import React from "react";
import UserEditDialog from "./UserEditDialog";
import { User, Customer } from "@/types";

interface UserEditSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: User & { customers: Customer[]; is_active: boolean }) => void;
  customers: Customer[];
  defaultValues?: (User & { customers: Customer[], is_active: boolean });
}

const UserEditSection: React.FC<UserEditSectionProps> = ({
  open,
  onOpenChange,
  onSave,
  customers,
  defaultValues
}) => {
  return (
    <UserEditDialog
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      customers={customers}
      defaultValues={defaultValues}
    />
  );
};

export default UserEditSection;

