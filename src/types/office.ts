export interface Office {
  intOfficeID: number;
  strOfficeName: string;
  strOfficeDescription?: string;
  strTelephoneNumber?: string;
  strEmail?: string;
  OfficeCode?: number;
  IS_ACT: boolean;
  IS_DELETED: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy?: string;
  UpdatedBy?: string;
  Version?: number;
  
  // Additional ERP fields
  CRT_BY?: number;
  CRT_AT?: Date;
  LST_MOD_BY?: number;
  LST_MOD_AT?: Date;
  DEL_BY?: number;
  DEL_AT?: Date;
  DEL_IP?: string;
  strFax?: string;
  strGPSCoords?: string;
  strPhotoPath?: string;
  intProvinceID?: number;
  intDivisionID?: number;
  intDistrictID?: number;
  intConstituencyID?: number;
  intPollingStationID?: number;
}

export interface NewOffice {
  strOfficeName: string;
  strOfficeDescription?: string;
  strTelephoneNumber?: string;
  strEmail?: string;
  OfficeCode?: number;
  IS_ACT?: boolean;
  CreatedBy?: string;
}

export interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  FocalPerson?: string;
  ContactNo?: string;
  Creator?: string;
  CreateDate: Date;
  Modifier?: string;
  ModifyDate?: Date;
  OfficeID: number;
  IS_ACT: boolean;
  HODID?: string;
  HODName?: string;
  WingCode?: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy?: string;
  UpdatedBy?: string;
  Version?: number;
}

export interface DEC {
  intAutoID: number;
  WingID: number;
  DECName: string;
  DECAcronym?: string;
  DECAddress?: string;
  Location?: string;
  IS_ACT: boolean;
  DateAdded: Date;
  DECCode?: number;
  DEC_ID: number; // Added: The DEC_ID field used in AspNetUsers.intBranchID
  HODID?: string;
  HODName?: string;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy?: string;
  UpdatedBy?: string;
  Version?: number;
}