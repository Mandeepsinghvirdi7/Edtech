import { BackendLoginResponse, TeamsData, SalesRecord } from '@/types';

const API_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) || import.meta.env.VITE_API_BASE_URL || '';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<BackendLoginResponse> {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ userId: username, password }),
    });
  }

async getMasterData(): Promise<SalesRecord[]> {
    return this.request('/api/data');
  }

  async updateUserStatus(name: string, branch: string, inactive?: boolean, isCurrentTeamMember?: boolean, teamName?: string): Promise<any> {
    const body: any = { branch };
    if (inactive !== undefined) body.inactive = inactive;
    if (isCurrentTeamMember !== undefined) body.isCurrentTeamMember = isCurrentTeamMember;
    if (teamName !== undefined) body.teamName = teamName;
    return this.request(`/api/users/${name}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
  }

  async updateUser(name: string, branch: string, updates: Partial<{ name: string; email?: string; role: string; branch: string; inactive: boolean; password?: string }>): Promise<any> {
    const body = { ...updates, branch };
    return this.request(`/api/users/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async updateUserRole(name: string, branch: string, newRole: string): Promise<any> {
    return this.request('/api/user/role', {
      method: 'PUT',
      body: JSON.stringify({ name, branch, newRole }),
    });
  }

  async updateBdeTeam(bdeName: string, newTeamLeader: string, month: string, branch: string): Promise<any> {
    return this.request('/api/bde-team', {
      method: 'PUT',
      body: JSON.stringify({ bdeName, newTeamLeader, month, branch }),
    });
  }

  async getTeams(): Promise<TeamsData> {
    return this.request('/api/teams');
  }

  async getBdeNames(): Promise<string[]> {
    return this.request('/api/bde-names');
  }

  async getUsers(): Promise<any[]> {
    return this.request('/api/users');
  }

  async uploadExcel(formData: FormData): Promise<any> {
    const url = `${API_BASE_URL}/api/upload-excel`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Excel upload failed:', error);
      throw error;
    }
  }

  async getDrives(): Promise<any[]> {
    return this.request(`/api/drives?cacheBust=${new Date().getTime()}`);
  }

  async createDrive(name: string, startMonth: number, startYear: number, endMonth: number, endYear: number): Promise<any> {
    return this.request('/api/drives', {
      method: 'POST',
      body: JSON.stringify({ name, startMonth, startYear, endMonth, endYear }),
    });
  }

  async updateTeamName(teamLeader: string, teamName: string, branch: string): Promise<any> {
    return this.request('/api/team-name', {
      method: 'PUT',
      body: JSON.stringify({ teamLeader, teamName, branch }),
    });
  }

  async createUser(name: string, email: string, password: string, role: string, branch: string, createdByAdmin: boolean = false): Promise<any> {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, branch, createdByAdmin }),
    });
  }

  async getRoles(): Promise<string[]> {
    return this.request('/api/roles');
  }

  async sendAccessEmail(userIds: string[]): Promise<any> {
    return this.request('/api/send-access-email', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  async validatePasswordToken(token: string): Promise<any> {
    return this.request(`/api/set-password/${token}`);
  }

  async setPassword(token: string, password: string): Promise<any> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
    });
  }
}

export const api = new ApiService();
