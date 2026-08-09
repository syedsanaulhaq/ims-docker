// Users Local Service - SQL Server based user management
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  officeId?: string;
  wingId?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: string;
  officeId?: string;
  wingId?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: string;
  officeId?: string;
  wingId?: string;
  active?: boolean;
}

const API_BASE_URL = 'http://localhost:3001';

export class UsersLocalService {
  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/by-username/${encodeURIComponent(username)}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw new Error(`Failed to fetch user: ${error}`);
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Delete user (soft delete - set inactive)
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error(`Failed to change password: ${error}`);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/by-role/${encodeURIComponent(role)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw new Error(`Failed to fetch users by role: ${error}`);
    }
  }

  /**
   * Get users by office
   */
  async getUsersByOffice(officeId: string): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/by-office/${encodeURIComponent(officeId)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching users by office:', error);
      throw new Error(`Failed to fetch users by office: ${error}`);
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error(`Failed to search users: ${error}`);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error(`Failed to fetch user stats: ${error}`);
    }
  }
}

// Export singleton instance
export const usersLocalService = new UsersLocalService();