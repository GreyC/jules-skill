import { getApiKey } from './auth';

const BASE_URL = 'https://jules.googleapis.com/v1alpha';

export class JulesClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getApiKey();
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-goog-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  static async validateKey(apiKey: string): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to validate key: ${response.status} ${response.statusText}`);
    }

    return true;
  }

  async getSessions(): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSession(id: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createSession(options: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async approvePlan(id: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions/${id}:approvePlan`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve plan: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async sendMessage(id: string, message: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions/${id}:sendMessage`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ prompt: message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getActivities(id: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/sessions/${id}/activities`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
