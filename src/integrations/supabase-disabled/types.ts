export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          category_name: string
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
      },
      item_serial_numbers: {
        Row: {
          id: string;
          tender_item_id: string;
          serial_number: string;
          status: string | null;
          remarks: string | null;
          created_at: string | null;
        },
        Insert: {
          id?: string;
          tender_item_id: string;
          serial_number: string;
          status?: string | null;
          remarks?: string | null;
          created_at?: string | null;
        },
        Update: {
          id?: string;
          tender_item_id?: string;
          serial_number?: string;
          status?: string | null;
          remarks?: string | null;
          created_at?: string | null;
        },
        Relationships: [
          {
            foreignKeyName: "item_serial_numbers_tender_item_id_fkey";
            columns: ["tender_item_id"];
            isOneToOne: false;
            referencedRelation: "tender_items";
            referencedColumns: ["id"];
          }
        ],
      },
      decs: {
        Row: {
          created_at: string | null
          date_added: string | null
          dec_acronym: string | null
          dec_address: string | null
          dec_code: number | null
          dec_name: string
          hod_id: string | null
          hod_name: string | null
          int_auto_id: number
          is_act: boolean | null
          location: string | null
          updated_at: string | null
          wing_id: number | null
        }
        Insert: {
          created_at?: string | null
          date_added?: string | null
          dec_acronym?: string | null
          dec_address?: string | null
          dec_code?: number | null
          dec_name: string
          hod_id?: string | null
          hod_name?: string | null
          int_auto_id?: number
          is_act?: boolean | null
          location?: string | null
          updated_at?: string | null
          wing_id?: number | null
        }
        Update: {
          created_at?: string | null
          date_added?: string | null
          dec_acronym?: string | null
          dec_address?: string | null
          dec_code?: number | null
          dec_name?: string
          hod_id?: string | null
          hod_name?: string | null
          int_auto_id?: number
          is_act?: boolean | null
          location?: string | null
          updated_at?: string | null
          wing_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "decs_wing_id_fkey"
            columns: ["wing_id"]
            isOneToOne: false
            referencedRelation: "wings"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget: number | null
          created_at: string | null
          department_code: string | null
          department_name: string
          description: string | null
          head_of_department: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          department_code?: string | null
          department_name: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          department_code?: string | null
          department_name?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          average_price: number | null
          brand: string | null
          category_id: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          item_code: string
          item_name: string
          item_type: string | null
          last_purchase_price: number | null
          maximum_stock: number | null
          minimum_stock: number | null
          model: string | null
          reorder_level: number | null
          serial_number_required: boolean | null
          status: string | null
          sub_category_id: string | null
          unit_of_measure: string
          unit_price: number | null
          updated_at: string | null
          vendor_id: string | null
          warranty_period: number | null
        }
        Insert: {
          average_price?: number | null
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          item_code: string
          item_name: string
          item_type?: string | null
          last_purchase_price?: number | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          model?: string | null
          reorder_level?: number | null
          serial_number_required?: boolean | null
          status?: string | null
          sub_category_id?: string | null
          unit_of_measure: string
          unit_price?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty_period?: number | null
        }
        Update: {
          average_price?: number | null
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          item_code?: string
          item_name?: string
          item_type?: string | null
          last_purchase_price?: number | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          model?: string | null
          reorder_level?: number | null
          serial_number_required?: boolean | null
          status?: string | null
          sub_category_id?: string | null
          unit_of_measure?: string
          unit_price?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty_period?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      item_masters: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          item_code: string
          nomenclature: string
          specifications: string | null
          status: string | null
          sub_category_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_code: string
          nomenclature: string
          specifications?: string | null
          status?: string | null
          sub_category_id?: string | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_code?: string
          nomenclature?: string
          specifications?: string | null
          status?: string | null
          sub_category_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_masters_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_masters_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          created_at: string | null
          description: string | null
          email: string | null
          id: number
          is_active: boolean | null
          is_deleted: boolean | null
          name: string
          office_code: string | null
          telephone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          is_deleted?: boolean | null
          name: string
          office_code?: string | null
          telephone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: number
          is_active?: boolean | null
          is_deleted?: boolean | null
          name?: string
          office_code?: string | null
          telephone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reorder_requests: {
        Row: {
          current_stock: number | null
          id: string
          item_id: string
          item_name: string
          minimum_stock: number | null
          requested_date: string | null
          status: string | null
        }
        Insert: {
          current_stock?: number | null
          id?: string
          item_id: string
          item_name: string
          minimum_stock?: number | null
          requested_date?: string | null
          status?: string | null
        }
        Update: {
          current_stock?: number | null
          id?: string
          item_id?: string
          item_name?: string
          minimum_stock?: number | null
          requested_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      spot_purchases: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          dec_ids: number[] | null
          department_id: string | null
          description: string | null
          document_path: string | null
          estimated_value: number | null
          id: string
          justification: string | null
          office_ids: number[] | null
          purchase_date: string
          purchase_number: string
          purchase_type: string | null
          reference_number: string | null
          required_delivery_date: string
          status: string | null
          title: string
          updated_at: string | null
          urgency_level: string | null
          vendor_id: string | null
          wing_ids: number[] | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          dec_ids?: number[] | null
          department_id?: string | null
          description?: string | null
          document_path?: string | null
          estimated_value?: number | null
          id?: string
          justification?: string | null
          office_ids?: number[] | null
          purchase_date: string
          purchase_number: string
          purchase_type?: string | null
          reference_number?: string | null
          required_delivery_date: string
          status?: string | null
          title: string
          updated_at?: string | null
          urgency_level?: string | null
          vendor_id?: string | null
          wing_ids?: number[] | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          dec_ids?: number[] | null
          department_id?: string | null
          description?: string | null
          document_path?: string | null
          estimated_value?: number | null
          id?: string
          justification?: string | null
          office_ids?: number[] | null
          purchase_date?: string
          purchase_number?: string
          purchase_type?: string | null
          reference_number?: string | null
          required_delivery_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          urgency_level?: string | null
          vendor_id?: string | null
          wing_ids?: number[] | null
        }
        Relationships: []
      }
      spot_purchases_items: {
        Row: {
          actual_unit_price: number | null
          created_at: string | null
          estimated_unit_price: number | null
          id: string
          item_master_id: string | null
          nomenclature: string
          quantity: number
          quantity_received: number | null
          remarks: string | null
          specifications: string | null
          spot_purchase_id: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_unit_price?: number | null
          created_at?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_master_id?: string | null
          nomenclature: string
          quantity: number
          quantity_received?: number | null
          remarks?: string | null
          specifications?: string | null
          spot_purchase_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_unit_price?: number | null
          created_at?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_master_id?: string | null
          nomenclature?: string
          quantity?: number
          quantity_received?: number | null
          remarks?: string | null
          specifications?: string | null
          spot_purchase_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_purchase_items_spot_purchase_id_fkey"
            columns: ["spot_purchase_id"]
            isOneToOne: false
            referencedRelation: "spot_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          date: string
          department: string | null
          id: string
          item: string
          quantity: number
          remarks: string | null
          tender_ref: string | null
          total_value: number
          type: string
          unit_price: number
          vendor: string | null
        }
        Insert: {
          date: string
          department?: string | null
          id?: string
          item: string
          quantity: number
          remarks?: string | null
          tender_ref?: string | null
          total_value: number
          type: string
          unit_price: number
          vendor?: string | null
        }
        Update: {
          date?: string
          department?: string | null
          id?: string
          item?: string
          quantity?: number
          remarks?: string | null
          tender_ref?: string | null
          total_value?: number
          type?: string
          unit_price?: number
          vendor?: string | null
        }
        Relationships: []
      }
      sub_categories: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          sub_category_name: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          sub_category_name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          sub_category_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_items: {
        Row: {
          actual_unit_price: number | null
          created_at: string
          estimated_unit_price: number
          id: string
          item_master_id: string
          nomenclature: string
          quantity: number
          quantity_received: number | null
          remarks: string | null
          specifications: string | null
          status: string | null
          tender_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actual_unit_price?: number | null
          created_at?: string
          estimated_unit_price?: number
          id?: string
          item_master_id: string
          nomenclature: string
          quantity?: number
          quantity_received?: number | null
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          tender_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actual_unit_price?: number | null
          created_at?: string
          estimated_unit_price?: number
          id?: string
          item_master_id?: string
          nomenclature?: string
          quantity?: number
          quantity_received?: number | null
          remarks?: string | null
          specifications?: string | null
          status?: string | null
          tender_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tender_items_item_masters_item_master_id"
            columns: ["item_master_id"]
            isOneToOne: false
            referencedRelation: "item_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tender_items_tenders_tender_id"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          advertisement_date: string | null
          contract_file_path: string | null
          created_at: string
          created_by: string | null
          dec_id: number | null
          dec_ids: number[] | null
          description: string | null
          document_path: string | null
          estimated_value: number
          id: string
          loi_file_path: string | null
          noting_file_path: string | null
          office_id: number | null
          office_ids: number[] | null
          opening_date: string
          po_file_path: string | null
          procedure_adopted: string | null
          procurement_method: string | null
          publication_daily: string | null
          publication_date: string
          publish_date: string
          reference_number: string | null
          rfp_file_path: string | null
          status: string | null
          submission_date: string
          submission_deadline: string
          tender_number: string | null
          tender_spot_type: string | null
          tender_type: string | null
          title: string | null
          updated_at: string
          vendor_id: string | null
          wing_id: number | null
          wing_ids: number[] | null
        }
        Insert: {
          advertisement_date?: string | null
          contract_file_path?: string | null
          created_at?: string
          created_by?: string | null
          dec_id?: number | null
          dec_ids?: number[] | null
          description?: string | null
          document_path?: string | null
          estimated_value?: number
          id?: string
          loi_file_path?: string | null
          noting_file_path?: string | null
          office_id?: number | null
          office_ids?: number[] | null
          opening_date: string
          po_file_path?: string | null
          procedure_adopted?: string | null
          procurement_method?: string | null
          publication_daily?: string | null
          publication_date: string
          publish_date: string
          reference_number?: string | null
          rfp_file_path?: string | null
          status?: string | null
          submission_date: string
          submission_deadline: string
          tender_number?: string | null
          tender_spot_type?: string | null
          tender_type?: string | null
          title?: string | null
          updated_at?: string
          vendor_id?: string | null
          wing_id?: number | null
          wing_ids?: number[] | null
        }
        Update: {
          advertisement_date?: string | null
          contract_file_path?: string | null
          created_at?: string
          created_by?: string | null
          dec_id?: number | null
          dec_ids?: number[] | null
          description?: string | null
          document_path?: string | null
          estimated_value?: number
          id?: string
          loi_file_path?: string | null
          noting_file_path?: string | null
          office_id?: number | null
          office_ids?: number[] | null
          opening_date?: string
          po_file_path?: string | null
          procedure_adopted?: string | null
          procurement_method?: string | null
          publication_daily?: string | null
          publication_date?: string
          publish_date?: string
          reference_number?: string | null
          rfp_file_path?: string | null
          status?: string | null
          submission_date?: string
          submission_deadline?: string
          tender_number?: string | null
          tender_spot_type?: string | null
          tender_type?: string | null
          title?: string | null
          updated_at?: string
          vendor_id?: string | null
          wing_id?: number | null
          wing_ids?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          status: string | null
          tax_number: string | null
          updated_at: string | null
          vendor_code: string
          vendor_name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          tax_number?: string | null
          updated_at?: string | null
          vendor_code: string
          vendor_name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          tax_number?: string | null
          updated_at?: string | null
          vendor_code?: string
          vendor_name?: string
        }
        Relationships: []
      }
      wings: {
        Row: {
          contact_no: string | null
          create_date: string | null
          created_at: string | null
          creator: string | null
          focal_person: string | null
          hod_id: string | null
          hod_name: string | null
          id: number
          is_act: boolean | null
          modifier: string | null
          modify_date: string | null
          name: string
          office_id: number | null
          short_name: string | null
          updated_at: string | null
          wing_code: number | null
        }
        Insert: {
          contact_no?: string | null
          create_date?: string | null
          created_at?: string | null
          creator?: string | null
          focal_person?: string | null
          hod_id?: string | null
          hod_name?: string | null
          id?: number
          is_act?: boolean | null
          modifier?: string | null
          modify_date?: string | null
          name: string
          office_id?: number | null
          short_name?: string | null
          updated_at?: string | null
          wing_code?: number | null
        }
        Update: {
          contact_no?: string | null
          create_date?: string | null
          created_at?: string | null
          creator?: string | null
          focal_person?: string | null
          hod_id?: string | null
          hod_name?: string | null
          id?: number
          is_act?: boolean | null
          modifier?: string | null
          modify_date?: string | null
          name?: string
          office_id?: number | null
          short_name?: string | null
          updated_at?: string | null
          wing_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wings_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_spot_purchase_items_with_details: {
        Args: { spot_purchase_id: string }
        Returns: {
          id: string
          spot_purchase_id: string
          item_master_id: string
          nomenclature: string
          quantity: number
          quantity_received: number
          estimated_unit_price: number
          actual_unit_price: number
          total_amount: number
          specifications: string
          remarks: string
          status: string
          created_at: string
          updated_at: string
        }[]
      }
      get_tender_items_with_details: {
        Args: { tender_id: string }
        Returns: {
          id: string
          tender_id: string
          item_master_id: string
          nomenclature: string
          quantity: number
          quantity_received: number
          estimated_unit_price: number
          actual_unit_price: number
          total_amount: number
          specifications: string
          remarks: string
          status: string
          created_at: string
          updated_at: string
          item_code: string
          item_description: string
          unit: string
        }[]
      }
      get_tender_summary: {
        Args: { tender_id: string }
        Returns: {
          id: string
          tender_number: string
          reference_number: string
          title: string
          status: string
          estimated_value: number
          items_count: number
          total_items_value: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Utility types for table rows, inserts, and updates

}
