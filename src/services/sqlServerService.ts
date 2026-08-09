import sql from 'mssql';

interface SqlServerConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
}

class SqlServerService {
  private config: SqlServerConfig;
  private pool: sql.ConnectionPool | null = null;

  constructor() {
    this.config = {
      server: process.env.SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
      database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
      user: process.env.SQL_SERVER_USER || 'sa',
      password: process.env.SQL_SERVER_PASSWORD || '1978Jupiter87@#',
      port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
      options: {
        encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
        trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT !== 'false'
      }
    };
  }

  async connect(): Promise<sql.ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    try {
      this.pool = await sql.connect(this.config);
      return this.pool;
    } catch (error) {
      console.error('❌ SQL Server connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      }
  }

  async query<T = any>(queryString: string, params?: any[]): Promise<T[]> {
    try {
      const pool = await this.connect();
      const request = pool.request();
      
      // Add parameters if provided
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(queryString);
      return result.recordset as T[];
    } catch (error) {
      console.error('❌ SQL query failed:', error);
      throw error;
    }
  }

  async execute(queryString: string, params?: any[]): Promise<void> {
    try {
      const pool = await this.connect();
      const request = pool.request();
      
      // Add parameters if provided
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      await request.query(queryString);
    } catch (error) {
      console.error('❌ SQL execution failed:', error);
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.query('SELECT 1 as test');
      return result.length > 0;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sqlServerService = new SqlServerService();
export default sqlServerService;
