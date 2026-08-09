// ERP Table Type Definitions
// Generated for tblOffices, DEC_MST, WingsInformation

export interface TblOffice {
  intOfficeID: number;
  strOfficeName?: string;
  strOfficeDescription?: string;
  CRT_BY?: number;
  CRT_AT?: Date;
  LST_MOD_BY?: number;
  LST_MOD_AT?: Date;
  IS_DELETED?: boolean;
  IS_ACT?: boolean;
  DEL_BY?: number;
  DEL_AT?: Date;
  DEL_IP?: string;
  strTelephoneNumber?: string;
  strFax?: string;
  strEmail?: string;
  strGPSCoords?: string;
  strPhotoPath?: string;
  intProvinceID?: number;
  intDivisionID?: number;
  intDistrictID?: number;
  intConstituencyID?: number;
  intPollingStationID?: bigint;
  OfficeCode?: number;
  CreatedBy?: string;
  CreatedAt?: Date;
  UpdatedBy?: string;
  UpdatedAt?: Date;
  Version?: number;
}

export interface DecMst {
  intAutoID: number;
  WingID?: number;
  DECName?: string;
  DECAcronym?: string;
  DECAddress?: string;
  Location?: string;
  IS_ACT?: boolean;
  DateAdded?: Date;
  DECCode?: number;
  HODID?: string;
  HODName?: string;
  CreatedBy?: string;
  CreatedAt?: Date;
  UpdatedBy?: string;
  UpdatedAt?: Date;
  Version?: number;
}

export interface WingsInformation {
  Id: number;
  Name?: string;
  ShortName?: string;
  FocalPerson?: string;
  ContactNo?: string;
  Creator?: string;
  CreateDate: Date;
  Modifier?: string;
  ModifyDate?: Date;
  OfficeID?: number;
  IS_ACT?: boolean;
  HODID?: string;
  HODName?: string;
  WingCode?: number;
  CreatedBy?: string;
  CreatedAt?: Date;
  UpdatedBy?: string;
  UpdatedAt?: Date;
  Version?: number;
}

// Legacy type aliases for backward compatibility
export type Office = TblOffice;
export type Dec = DecMst;
export type Wing = WingsInformation;
