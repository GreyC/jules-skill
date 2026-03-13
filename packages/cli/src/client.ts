import { getApiKey } from './auth';

const BASE_URL = 'https://jules.googleapis.com/v1alpha';

export class JulesClient {
  private apiKey: string;

  constructor() {
    this.apiKey = getApiKey();
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-goog-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
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
}
