/**
 * ERP DATABASE SERVICE
 * 
 * Service for ERP tables with mock data for frontend development
 * This provides the interface for:
 * - tblOffices
 * - DEC_MST  
 * - WingsInformation
 * - AspNetUsers
 */

import { Office, Wing, DEC } from '@/types/office';

// User interface matching AspNetUsers table structure
export interface User {
  Id: string;
  FullName: string;
  intOfficeID: number;
  intWingID: number;
  intBranchID: number;
  intDesignationID?: number;
  DesignationID?: number;  // Added: From view
  DesignationName?: string; // Added: From view
  Role?: string;
  CNIC?: string;
  Email?: string;
  PhoneNumber?: string;
  ISACT: boolean;
}

class ERPDatabaseService {
  // Mock data for development - replace with actual API calls
  private mockOffices: Office[] = [
    {
      intOfficeID: 583,
      strOfficeName: "ECP Secretariat",
      strOfficeDescription: "Main Election Commission Office",
      strTelephoneNumber: "+92-51-9876543",
      strEmail: "info@ecp.gov.pk",
      OfficeCode: 1,
      IS_ACT: true,
      IS_DELETED: false,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      intOfficeID: 584,
      strOfficeName: "PEC Balochistan",
      strOfficeDescription: "Provincial Election Commissioner Balochistan",
      strTelephoneNumber: "+92-81-123456",
      strEmail: "balochistan@ecp.gov.pk",
      OfficeCode: 2,
      IS_ACT: true,
      IS_DELETED: false,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      intOfficeID: 585,
      strOfficeName: "PEC Khyber Pakhtunkhwa",
      strOfficeDescription: "Provincial Election Commissioner KPK",
      strTelephoneNumber: "+92-91-123456",
      strEmail: "kpk@ecp.gov.pk",
      OfficeCode: 3,
      IS_ACT: true,
      IS_DELETED: false,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    }
  ];

  private mockWings: Wing[] = [
    {
      Id: 1,
      Name: "Information Technology Wing",
      ShortName: "IT",
      FocalPerson: "IT Manager",
      ContactNo: "+92-51-9876544",
      Creator: "System",
      CreateDate: new Date('2024-01-01'),
      Modifier: "System",
      ModifyDate: new Date('2024-01-01'),
      OfficeID: 583,
      IS_ACT: true,
      HODID: "IT001",
      HODName: "IT Head",
      WingCode: 101,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      Id: 2,
      Name: "Administration Wing",
      ShortName: "Admin",
      FocalPerson: "Admin Manager",
      ContactNo: "+92-51-9876545",
      Creator: "System",
      CreateDate: new Date('2024-01-01'),
      Modifier: "System",
      ModifyDate: new Date('2024-01-01'),
      OfficeID: 583,
      IS_ACT: true,
      HODID: "ADM001",
      HODName: "Admin Head",
      WingCode: 102,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      Id: 3,
      Name: "Law Wing",
      ShortName: "Law",
      FocalPerson: "Legal Advisor",
      ContactNo: "+92-51-9876546",
      Creator: "System",
      CreateDate: new Date('2024-01-01'),
      Modifier: "System",
      ModifyDate: new Date('2024-01-01'),
      OfficeID: 583,
      IS_ACT: true,
      HODID: "LAW001",
      HODName: "Legal Head",
      WingCode: 103,
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    }
  ];

  private mockDECs: DEC[] = [
    {
      intAutoID: 1,
      WingID: 1,
      DECName: "DEC Islamabad",
      DECAcronym: "DEC-ISB",
      DECAddress: "Constitution Avenue, Islamabad",
      Location: "Islamabad",
      IS_ACT: true,
      DateAdded: new Date('2024-01-01'),
      DECCode: 1001,
      DEC_ID: 1,
      HODID: "DEC001",
      HODName: "DEC Head Islamabad",
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      intAutoID: 2,
      WingID: 2,
      DECName: "DEC Rawalpindi",
      DECAcronym: "DEC-RWP",
      DECAddress: "Mall Road, Rawalpindi",
      Location: "Rawalpindi",
      IS_ACT: true,
      DateAdded: new Date('2024-01-01'),
      DECCode: 1002,
      DEC_ID: 2,
      HODID: "DEC002",
      HODName: "DEC Head Rawalpindi",
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    },
    {
      intAutoID: 3,
      WingID: 3,
      DECName: "DEC Lahore",
      DECAcronym: "DEC-LHR",
      DECAddress: "Mall Road, Lahore",
      Location: "Lahore",
      IS_ACT: true,
      DateAdded: new Date('2024-01-01'),
      DECCode: 1003,
      DEC_ID: 3,
      HODID: "DEC003",
      HODName: "DEC Head Lahore",
      CreatedAt: new Date('2024-01-01'),
      UpdatedAt: new Date('2024-01-01'),
      CreatedBy: "System",
      UpdatedBy: "System",
      Version: 1
    }
  ];

  // Office services
  async getActiveOffices(): Promise<Office[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/offices`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const offices = await response.json();
      return offices;
    } catch (error) {
      console.error('❌ Error fetching active offices from API:', error);
      // Fallback to mock data if API fails
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockOffices.filter(office => office.IS_ACT && !office.IS_DELETED);
    }
  }

  async getAllOffices(): Promise<Office[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockOffices;
    } catch (error) {
      console.error('Error fetching all offices:', error);
      throw error;
    }
  }

  // Wing services
  async getActiveWings(): Promise<Wing[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const wings = await response.json();
      return wings;
    } catch (error) {
      console.error('❌ Error fetching active wings from API:', error);
      // Fallback to mock data if API fails
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockWings.filter(wing => wing.IS_ACT);
    }
  }

  // Alias method for WingsInformation table - same as getActiveWings
  async getWingsInformation(): Promise<Wing[]> {
    return this.getActiveWings();
  }

  async getWingsByOffice(officeId: number): Promise<Wing[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockWings.filter(wing => wing.OfficeID === officeId && wing.IS_ACT);
    } catch (error) {
      console.error('Error fetching wings by office:', error);
      throw error;
    }
  }

  async getAllWings(): Promise<Wing[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockWings;
    } catch (error) {
      console.error('Error fetching all wings:', error);
      throw error;
    }
  }

  // DEC services
  async getActiveDecs(): Promise<DEC[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/decs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const decs = await response.json();
      return decs;
    } catch (error) {
      console.error('❌ Error fetching active DECs from SQL Server:', error);
      // Fallback to mock data if SQL Server fails
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockDECs.filter(dec => dec.IS_ACT);
    }
  }

  async getDecsByWing(wingId: number): Promise<DEC[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockDECs.filter(dec => dec.WingID === wingId && dec.IS_ACT);
    } catch (error) {
      console.error('Error fetching DECs by wing:', error);
      throw error;
    }
  }

  async getAllDecs(): Promise<DEC[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.mockDECs;
    } catch (error) {
      console.error('Error fetching all DECs:', error);
      throw error;
    }
  }

  // Users services
  async getActiveUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/aspnet-users/active`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      // Handle the API response format {success: true, data: [...]}
      const users = result.success ? result.data : result;
      
      return users || [];
    } catch (error) {
      console.error('❌ Error fetching active users from AspNetUsers API:', error);
      // Fallback to mock data if API fails
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const mockUsers = [
        {
          Id: '1',
          FullName: 'John Smith',
          intOfficeID: 583,
          intWingID: 16,
          intBranchID: 166,
          intDesignationID: 2766,
          Role: 'Manager',
          CNIC: '12345-6789012-3',
          Email: 'john.smith@office.gov',
          PhoneNumber: '0300-1234567',
          ISACT: true
        },
        {
          Id: '2',
          FullName: 'Jane Doe',
          intOfficeID: 584,
          intWingID: 29,
          intBranchID: 178,
          intDesignationID: 1767,
          Role: 'Assistant',
          CNIC: '98765-4321098-7',
          Email: 'jane.doe@office.gov',
          PhoneNumber: '0300-7654321',
          ISACT: true
        },
        {
          Id: '3',
          FullName: 'Mike Johnson',
          intOfficeID: 585,
          intWingID: 139,
          intBranchID: 32,
          intDesignationID: 2766,
          Role: 'Officer',
          CNIC: '11111-2222233-4',
          Email: 'mike.johnson@office.gov',
          PhoneNumber: '0300-1111111',
          ISACT: true
        }
      ];
      
      return mockUsers;
    }
  }

  // Get filtered users by office, wing, and optionally branch
  async getFilteredUsers(officeId: number, wingId: number, branchId?: number | string): Promise<any[]> {
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/aspnet-users/filtered?officeId=${officeId}&wingId=${wingId}`;
      
      // Add branch filter if provided and not "ALL_BRANCHES"
      if (branchId && branchId !== 'ALL_BRANCHES') {
        url += `&branchId=${branchId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      // Handle the API response format {success: true, data: [...]}
      const users = result.success ? result.data : result;
      
      return users || [];
    } catch (error) {
      console.error('❌ Error fetching filtered users from API:', error);
      return [];
    }
  }

  // Hierarchy services
  async getOfficeHierarchy(): Promise<any[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const hierarchy = this.mockOffices.map(office => ({
        office,
        wings: this.mockWings.filter(wing => wing.OfficeID === office.intOfficeID),
        decs: this.mockDECs.filter(dec => 
          this.mockWings.some(wing => wing.Id === dec.WingID && wing.OfficeID === office.intOfficeID)
        )
      }));
      
      return hierarchy;
    } catch (error) {
      console.error('Error fetching office hierarchy:', error);
      throw error;
    }
  }

  // Statistics
  async getEntityCounts(): Promise<{ offices: number; wings: number; decs: number }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        offices: this.mockOffices.filter(o => o.IS_ACT && !o.IS_DELETED).length,
        wings: this.mockWings.filter(w => w.IS_ACT).length,
        decs: this.mockDECs.filter(d => d.IS_ACT).length
      };
    } catch (error) {
      console.error('Error fetching entity counts:', error);
      throw error;
    }
  }
}

// Create singleton instance and export it as default and named export
const erpDatabaseService = new ERPDatabaseService();

export default erpDatabaseService;
export { erpDatabaseService };
