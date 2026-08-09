/**
 * ERP TABLES CONFIGURATION
 * 
 * Configuration for switching between Supabase and SQL Server
 * for the three ERP reference tables
 */

// Environment configuration
export const ERP_CONFIG = {
  // Use SQL Server for ERP tables instead of Supabase
  USE_SQL_SERVER_FOR_ERP: true,
  
  // SQL Server connection details
  SQL_SERVER: {
    server: 'SYED-FAZLI-LAPT',
    database: 'InventoryManagementDB', 
    user: 'sa',
    password: '1978Jupiter87@#',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  },

  // Table mapping configuration
  ERP_TABLES: {
    offices: {
      tableName: 'tblOffices',
      primaryKey: 'intOfficeID',
      nameField: 'strOfficeName',
      activeField: 'IS_ACT',
      deletedField: 'IS_DELETED'
    },
    wings: {
      tableName: 'WingsInformation',
      primaryKey: 'Id', 
      nameField: 'Name',
      activeField: 'IS_ACT',
      foreignKey: 'OfficeID'
    },
    decs: {
      tableName: 'DEC_MST',
      primaryKey: 'intAutoID',
      nameField: 'DECName', 
      activeField: 'IS_ACT',
      foreignKey: 'WingID'
    }
  },

  // Column mappings for backward compatibility
  COLUMN_MAPPINGS: {
    tblOffices: {
      'id': 'intOfficeID',
      'name': 'strOfficeName',
      'description': 'strOfficeDescription',
      'telephone_number': 'strTelephoneNumber',
      'email': 'strEmail',
      'office_code': 'OfficeCode',
      'is_active': 'IS_ACT',
      'is_deleted': 'IS_DELETED',
      'created_at': 'CreatedAt',
      'updated_at': 'UpdatedAt'
    },
    WingsInformation: {
      'id': 'Id',
      'name': 'Name',
      'short_name': 'ShortName',
      'focal_person': 'FocalPerson',
      'contact_no': 'ContactNo',
      'office_id': 'OfficeID',
      'is_act': 'IS_ACT',
      'hod_id': 'HODID',
      'hod_name': 'HODName',
      'wing_code': 'WingCode',
      'created_at': 'CreatedAt',
      'updated_at': 'UpdatedAt'
    },
    DEC_MST: {
      'int_auto_id': 'intAutoID',
      'wing_id': 'WingID',
      'dec_name': 'DECName',
      'dec_acronym': 'DECAcronym',
      'dec_address': 'DECAddress',
      'location': 'Location',
      'is_act': 'IS_ACT',
      'date_added': 'DateAdded',
      'dec_code': 'DECCode',
      'hod_id': 'HODID',
      'hod_name': 'HODName',
      'created_at': 'CreatedAt',
      'updated_at': 'UpdatedAt'
    }
  }
};

// Helper function to get the correct service based on configuration
export const getERPTableService = () => {
  if (ERP_CONFIG.USE_SQL_SERVER_FOR_ERP) {
    // Return SQL Server service
    return import('../services/erpDatabaseService').then(module => module.erpDatabaseService);
  } else {
    // Return Supabase service (fallback)
    return import('../integrations/supabase/client').then(module => module.supabase);
  }
};

// Helper function to map old column names to new ERP column names
export const mapColumnName = (tableName: string, oldColumnName: string): string => {
  const mapping = ERP_CONFIG.COLUMN_MAPPINGS[tableName as keyof typeof ERP_CONFIG.COLUMN_MAPPINGS];
  return mapping?.[oldColumnName as keyof typeof mapping] || oldColumnName;
};

// Helper function to get ERP table configuration
export const getERPTableConfig = (oldTableName: string) => {
  switch (oldTableName) {
    case 'offices':
      return ERP_CONFIG.ERP_TABLES.offices;
    case 'wings':
      return ERP_CONFIG.ERP_TABLES.wings;
    case 'decs':
      return ERP_CONFIG.ERP_TABLES.decs;
    default:
      return null;
  }
};

export default ERP_CONFIG;
