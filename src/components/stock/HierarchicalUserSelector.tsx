import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, MapPin, User } from 'lucide-react';
import { useHierarchicalUserSelection } from '@/hooks/useHierarchicalUserSelection';

interface HierarchicalUserSelectorProps<T extends FieldValues> {
  control: Control<T>;
  officeFieldName: FieldPath<T>;
  wingFieldName: FieldPath<T>;
  branchFieldName: FieldPath<T>;
  userFieldName: FieldPath<T>;
  title?: string;
  description?: string;
  showSelectionPath?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function HierarchicalUserSelector<T extends FieldValues>({
  control,
  officeFieldName,
  wingFieldName,
  branchFieldName,
  userFieldName,
  title = "User Selection",
  description = "Select user through organizational hierarchy",
  showSelectionPath = true,
  required = true,
  disabled = false,
}: HierarchicalUserSelectorProps<T>) {
  const {
    offices,
    wings,
    branches,
    users,
    isLoadingOffices,
    isLoadingWings,
    isLoadingBranches,
    isLoadingUsers,
    selection,
    handleOfficeChange,
    handleWingChange,
    handleBranchChange,
    handleUserChange,
    filteredWings,
    filteredBranches,
    filteredUsers,
    getSelectionPath,
    getSelectedUserDetails,
  } = useHierarchicalUserSelection();

  const selectedUser = getSelectedUserDetails();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {showSelectionPath && getSelectionPath() && (
          <Badge variant="outline" className="w-fit">
            {getSelectionPath()}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Office Selection */}
        <FormField
          control={control}
          name={officeFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Office {required && <span className="text-red-500">*</span>}
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  const officeId = value ? parseInt(value) : null;
                  field.onChange(officeId);
                  handleOfficeChange(officeId);
                }}
                value={field.value ? field.value.toString() : ''}
                disabled={disabled || isLoadingOffices}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an office" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingOffices ? (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : offices.length === 0 ? (
                    <SelectItem value="no-offices" disabled>
                      No offices available
                    </SelectItem>
                  ) : (
                    offices.map((office) => (
                      <SelectItem
                        key={office.intOfficeID}
                        value={office.intOfficeID.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {office.strOfficeName}
                          {office.OfficeCode && (
                            <Badge variant="secondary" className="text-xs">
                              {office.OfficeCode}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Wing Selection */}
        <FormField
          control={control}
          name={wingFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Wing {required && <span className="text-red-500">*</span>}
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  const wingId = value ? parseInt(value) : null;
                  field.onChange(wingId);
                  handleWingChange(wingId);
                }}
                value={field.value ? field.value.toString() : ''}
                disabled={disabled || isLoadingWings || !selection.selectedOfficeId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wing" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingWings ? (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : !selection.selectedOfficeId ? (
                    <SelectItem value="no-office" disabled>
                      Please select an office first
                    </SelectItem>
                  ) : filteredWings.length === 0 ? (
                    <SelectItem value="no-wings" disabled>
                      No wings available for selected office
                    </SelectItem>
                  ) : (
                    filteredWings.map((wing) => (
                      <SelectItem
                        key={wing.intOfficeID}
                        value={wing.intOfficeID.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {wing.strOfficeName}
                          {wing.short_strOfficeName && (
                            <Badge variant="secondary" className="text-xs">
                              {wing.short_strOfficeName}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Branch (DEC) Selection */}
        <FormField
          control={control}
          name={branchFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Branch/DEC {required && <span className="text-red-500">*</span>}
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  const branchId = value ? parseInt(value) : null;
                  field.onChange(branchId);
                  handleBranchChange(branchId);
                }}
                value={field.value ? field.value.toString() : ''}
                disabled={disabled || isLoadingBranches || !selection.selectedWingId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch/DEC" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingBranches ? (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : !selection.selectedWingId ? (
                    <SelectItem value="no-wing" disabled>
                      Please select a wing first
                    </SelectItem>
                  ) : filteredBranches.length === 0 ? (
                    <SelectItem value="no-branches" disabled>
                      No branches available for selected wing
                    </SelectItem>
                  ) : (
                    filteredBranches.map((branch) => (
                      <SelectItem
                        key={branch.int_auto_intOfficeID}
                        value={branch.int_auto_intOfficeID.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {branch.dec_strOfficeName}
                          {branch.DECAcronym && (
                            <Badge variant="secondary" className="text-xs">
                              {branch.DECAcronym}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* User Selection */}
        <FormField
          control={control}
          name={userFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User {required && <span className="text-red-500">*</span>}
              </FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value || null);
                  handleUserChange(value || null);
                }}
                value={field.value || ''}
                disabled={disabled || isLoadingUsers || !selection.selectedBranchId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingUsers ? (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : !selection.selectedBranchId ? (
                    <SelectItem value="no-branch" disabled>
                      Please select a branch first
                    </SelectItem>
                  ) : filteredUsers.length === 0 ? (
                    <SelectItem value="no-users" disabled>
                      No users available for selected branch
                    </SelectItem>
                  ) : (
                    filteredUsers.map((user) => (
                      <SelectItem
                        key={user.Id}
                        value={user.Id}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span className="font-medium">{user.FullName}</span>
                            {(user.DesignationName || user.Role) && (
                              <Badge variant="outline" className="text-xs">
                                {user.DesignationName || user.Role}
                              </Badge>
                            )}
                          </div>
                          {user.UserName && (
                            <span className="text-xs text-muted-foreground">
                              @{user.UserName}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Selected User Details */}
        {selectedUser && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected User Details:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {selectedUser.FullName}
              </div>
              <div>
                <span className="font-medium">Username:</span> {selectedUser.UserName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {selectedUser.Email}
              </div>
              <div>
                <span className="font-medium">Designation:</span> {selectedUser.DesignationName || selectedUser.Role || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
