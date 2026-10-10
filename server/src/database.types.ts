
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agent_drafts": {
                  Row: {
                    "applied_at": string | null,"created_at": string,"customer_id": string | null,"decided_at": string | null,"decided_by": string | null,"estimate_id": string | null,"id": string,"job_id": string | null,"kind": Database["public"]['Enums']["agent_draft_kind"],"payload": NonNullable<Json>,"reason": string | null,"requested_by": string | null,"result": Json | null,"shop_id": string,"status": Database["public"]['Enums']["agent_draft_status"],"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"created_at"?: string,"customer_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"estimate_id"?: string | null,"id"?: string,"job_id"?: string | null,"kind": Database["public"]['Enums']["agent_draft_kind"],"payload": NonNullable<Json>,"reason"?: string | null,"requested_by"?: string | null,"result"?: Json | null,"shop_id": string,"status"?: Database["public"]['Enums']["agent_draft_status"],"summary": string
                  }
                  Update: {
                    "applied_at"?: string | null,"created_at"?: string,"customer_id"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"estimate_id"?: string | null,"id"?: string,"job_id"?: string | null,"kind"?: Database["public"]['Enums']["agent_draft_kind"],"payload"?: NonNullable<Json>,"reason"?: string | null,"requested_by"?: string | null,"result"?: Json | null,"shop_id"?: string,"status"?: Database["public"]['Enums']["agent_draft_status"],"summary"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_drafts_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customer_summaries"
      referencedColumns: ["customer_id","shop_id"]
    },{
      foreignKeyName: "agent_drafts_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "agent_drafts_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimate_totals"
      referencedColumns: ["estimate_id","shop_id"]
    },{
      foreignKeyName: "agent_drafts_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimates"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "agent_drafts_job_id_shop_id_fkey"
      columns: ["job_id","shop_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "agent_drafts_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "address": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string | null,"phone": string | null,"shop_id": string,"status": Database["public"]['Enums']["customer_status"],"type": Database["public"]['Enums']["customer_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"phone"?: string | null,"shop_id": string,"status"?: Database["public"]['Enums']["customer_status"],"type"?: Database["public"]['Enums']["customer_type"]
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"phone"?: string | null,"shop_id"?: string,"status"?: Database["public"]['Enums']["customer_status"],"type"?: Database["public"]['Enums']["customer_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"estimate_items": {
                  Row: {
                    "description": string,"estimate_id": string,"id": string,"kind": Database["public"]['Enums']["line_item_kind"],"position": number,"quantity": number,"shop_id": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"estimate_id": string,"id"?: string,"kind"?: Database["public"]['Enums']["line_item_kind"],"position"?: number,"quantity": number,"shop_id": string,"unit_price": number
                  }
                  Update: {
                    "description"?: string,"estimate_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["line_item_kind"],"position"?: number,"quantity"?: number,"shop_id"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "estimate_items_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimate_totals"
      referencedColumns: ["estimate_id","shop_id"]
    },{
      foreignKeyName: "estimate_items_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimates"
      referencedColumns: ["id","shop_id"]
    }
                  ]
                },"estimates": {
                  Row: {
                    "created_at": string,"customer_id": string,"description": string | null,"id": string,"sent_at": string | null,"shop_id": string,"status": Database["public"]['Enums']["estimate_status"],"tax_rate": number,"title": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"description"?: string | null,"id"?: string,"sent_at"?: string | null,"shop_id": string,"status"?: Database["public"]['Enums']["estimate_status"],"tax_rate": number,"title": string,"valid_until"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"description"?: string | null,"id"?: string,"sent_at"?: string | null,"shop_id"?: string,"status"?: Database["public"]['Enums']["estimate_status"],"tax_rate"?: number,"title"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "estimates_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customer_summaries"
      referencedColumns: ["customer_id","shop_id"]
    },{
      foreignKeyName: "estimates_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "estimates_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "actual_hours": number | null,"address": string | null,"assigned_to": string | null,"completed_at": string | null,"created_at": string,"customer_id": string,"description": string | null,"estimate_id": string | null,"estimated_hours": number | null,"id": string,"notes": string | null,"price": number | null,"priority": Database["public"]['Enums']["job_priority"],"scheduled_at": string | null,"shop_id": string,"status": Database["public"]['Enums']["job_status"],"title": string,"type": Database["public"]['Enums']["job_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_hours"?: number | null,"address"?: string | null,"assigned_to"?: string | null,"completed_at"?: string | null,"created_at"?: string,"customer_id": string,"description"?: string | null,"estimate_id"?: string | null,"estimated_hours"?: number | null,"id"?: string,"notes"?: string | null,"price"?: number | null,"priority"?: Database["public"]['Enums']["job_priority"],"scheduled_at"?: string | null,"shop_id": string,"status"?: Database["public"]['Enums']["job_status"],"title": string,"type": Database["public"]['Enums']["job_type"]
                  }
                  Update: {
                    "actual_hours"?: number | null,"address"?: string | null,"assigned_to"?: string | null,"completed_at"?: string | null,"created_at"?: string,"customer_id"?: string,"description"?: string | null,"estimate_id"?: string | null,"estimated_hours"?: number | null,"id"?: string,"notes"?: string | null,"price"?: number | null,"priority"?: Database["public"]['Enums']["job_priority"],"scheduled_at"?: string | null,"shop_id"?: string,"status"?: Database["public"]['Enums']["job_status"],"title"?: string,"type"?: Database["public"]['Enums']["job_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customer_summaries"
      referencedColumns: ["customer_id","shop_id"]
    },{
      foreignKeyName: "jobs_customer_id_shop_id_fkey"
      columns: ["customer_id","shop_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "jobs_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimate_totals"
      referencedColumns: ["estimate_id","shop_id"]
    },{
      foreignKeyName: "jobs_estimate_id_shop_id_fkey"
      columns: ["estimate_id","shop_id"]
isOneToOne: false
      referencedRelation: "estimates"
      referencedColumns: ["id","shop_id"]
    },{
      foreignKeyName: "jobs_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shop_members": {
                  Row: {
                    "created_at": string,"display_name": string | null,"role": Database["public"]['Enums']["shop_role"],"shop_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"role"?: Database["public"]['Enums']["shop_role"],"shop_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"role"?: Database["public"]['Enums']["shop_role"],"shop_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shop_members_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "created_at": string,"id": string,"labor_rate": number | null,"name": string,"tax_rate": number,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"labor_rate"?: number | null,"name": string,"tax_rate"?: number,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"labor_rate"?: number | null,"name"?: string,"tax_rate"?: number,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "customer_summaries": {
                  Row: {
                    "completed_revenue": number | null,"customer_id": string | null,"last_job_completed_at": string | null,"shop_id": string | null,"total_jobs": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "customers_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                },"estimate_totals": {
                  Row: {
                    "estimate_id": string | null,"shop_id": string | null,"subtotal": number | null,"tax": number | null,"total": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "estimates_shop_id_fkey"
      columns: ["shop_id"]
isOneToOne: false
      referencedRelation: "shops"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "approve_agent_draft":
{ Args: { "p_customer_id"?: string,"p_draft_id": string }; Returns: Json
                           },
"convert_estimate_to_job":
{ Args: { "p_estimate_id": string,"p_estimated_hours"?: number,"p_scheduled_at"?: string,"p_type": Database["public"]['Enums']["job_type"] }; Returns: string
                           },
"create_shop":
{ Args: { "p_display_name"?: string,"p_name": string }; Returns: string
                           },
"is_shop_member":
{ Args: { "p_shop_id": string }; Returns: boolean
                           },
"is_shop_owner":
{ Args: { "p_shop_id": string }; Returns: boolean
                           },
"reject_agent_draft":
{ Args: { "p_draft_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "agent_draft_kind": "estimate"|"message"|"schedule-change"|"materials-list"|"invoice","agent_draft_status": "proposed"|"approved"|"rejected"|"applied"|"failed","customer_status": "active"|"inactive","customer_type": "residential"|"commercial","estimate_status": "draft"|"sent"|"approved"|"rejected","job_priority": "low"|"medium"|"high"|"urgent","job_status": "scheduled"|"in-progress"|"completed"|"cancelled","job_type": "installation"|"repair"|"maintenance"|"inspection"|"upgrade","line_item_kind": "material"|"labor"|"permit"|"other","shop_role": "owner"|"tech"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "agent_draft_kind": ["estimate", "message", "schedule-change", "materials-list", "invoice"],"agent_draft_status": ["proposed", "approved", "rejected", "applied", "failed"],"customer_status": ["active", "inactive"],"customer_type": ["residential", "commercial"],"estimate_status": ["draft", "sent", "approved", "rejected"],"job_priority": ["low", "medium", "high", "urgent"],"job_status": ["scheduled", "in-progress", "completed", "cancelled"],"job_type": ["installation", "repair", "maintenance", "inspection", "upgrade"],"line_item_kind": ["material", "labor", "permit", "other"],"shop_role": ["owner", "tech"]
          }
        }
} as const
