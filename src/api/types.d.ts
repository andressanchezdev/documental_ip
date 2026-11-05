/**
 * TypeScript Type Definitions for Google Sheets & Docs Backend API
 */

// ==========================================
// Módulo 1: Google Sheets Types
// ==========================================

export interface TabInfo {
  sheet_id: number;
  title: string;
  index: number;
  row_count: number;
  column_count: number;
  hidden: boolean;
}

export interface CreateTabPayload {
  title: string;
  row_count?: number;
  column_count?: number;
}

export interface RenameTabPayload {
  title: string;
}

export interface DuplicateTabPayload {
  new_title: string;
}

export type SheetRenderOption = 'FORMATTED_VALUE' | 'FORMULA' | 'UNFORMATTED_VALUE';

export interface GetValuesParams {
  sheet_name?: string;
  range?: string;
  render_option?: SheetRenderOption;
}

export interface SheetValuesResponse {
  sheet_name: string;
  range: string;
  render_option: SheetRenderOption;
  rows: (string | number | boolean | null)[][];
}

export interface SetFormulaPayload {
  sheet_name?: string;
  cell: string; // e.g. "E15"
  formula: string; // e.g. "=SUM(E1:E14)"
}

export interface ColumnValuesPayload {
  sheet_name?: string;
  values: (string | number | boolean | null)[];
}

export interface RowValuesPayload {
  sheet_name?: string;
  values: (string | number | boolean | null)[];
}

export interface DimensionPayload {
  sheet_id: number;
  dimension: 'ROWS' | 'COLUMNS';
  operation: 'INSERT' | 'DELETE';
  start_index: number; // 0-based
  end_index: number;
  inherit_from_before?: boolean;
}

export interface ResizeDimensionPayload {
  sheet_id: number;
  dimension: 'ROWS' | 'COLUMNS';
  start_index: number;
  end_index: number;
}

export interface BasicFilterPayload {
  sheet_id: number;
  start_row_index: number;
  end_row_index: number;
  start_col_index: number;
  end_col_index: number;
}

export type ImageFitMode = 1 | 2 | 3 | 4; // 1: Fit cell keeping aspect ratio, 2: Stretch, 3: Original, 4: Custom

export interface InsertSheetImageUrlPayload {
  sheet_name?: string;
  cell: string;
  image_url: string;
  mode?: ImageFitMode;
  height?: number;
  width?: number;
}

export interface UploadSheetImageParams {
  imageFile: File | Blob;
  cell: string;
  sheet_name?: string;
  mode?: ImageFitMode;
}

// ==========================================
// Módulo 2: Google Docs Types
// ==========================================

export interface HeaderInfo {
  header_id: string;
  type: string;
}

export interface FooterInfo {
  footer_id: string;
  type: string;
}

export interface DocumentStructureResponse {
  document_id: string;
  title: string;
  headers?: HeaderInfo[];
  footers?: FooterInfo[];
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  margin_header?: number;
  margin_footer?: number;
  page_size?: {
    width: number;
    height: number;
  };
}

export interface CreateHeaderPayload {
  header_type?: 'DEFAULT' | 'FIRST_PAGE_HEADER';
}

export interface HeaderContentPayload {
  text: string;
  image_url?: string;
  image_width?: number; // in pt
  image_height?: number; // in pt
  alignment?: 'START' | 'CENTER' | 'END';
}

export interface FooterContentPayload {
  text: string;
  alignment?: 'START' | 'CENTER' | 'END';
}

export interface ParagraphFormatPayload {
  segment_id?: string;
  start_index: number;
  end_index: number;
  indent_start?: number; // in pt (36pt = 0.5 inch)
  indent_end?: number;
  indent_first_line?: number;
  alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
  line_spacing?: number; // 100 = 1.0, 115 = 1.15, 150 = 1.5, 200 = 2.0
  space_above?: number; // in pt
  space_below?: number; // in pt
  named_style_type?: 'NORMAL_TEXT' | 'TITLE' | 'HEADING_1' | 'HEADING_2';
}

export interface PageMarginsPayload {
  margin_top?: number; // in pt (72pt = 1 inch = 2.54cm)
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  margin_header?: number;
  margin_footer?: number;
}

export interface TextFormatPayload {
  start_index: number;
  end_index: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  font_size?: number; // e.g. 12.0
  font_family?: string; // e.g. 'Roboto'
  foreground_color?: string; // e.g. '#1A73E8'
}

export type BulletPreset = 'BULLET_DISC_CIRCLE_SQUARE' | 'NUMBERED_DECIMAL_ALPHA_ROMAN';

export interface BulletsPayload {
  start_index: number;
  end_index: number;
  bullet_preset?: BulletPreset;
}

export interface InsertDocImageUrlPayload {
  image_url: string;
  segment_id?: string;
  index?: number;
  width?: number;
  height?: number;
}

export interface UploadDocImageParams {
  imageFile: File | Blob;
  segment_id?: string;
  width?: number;
  height?: number;
}

// ==========================================
// Módulo 3: Utilidad General de Imágenes
// ==========================================

export interface ImageUploadResponse {
  file_id: string;
  file_name: string;
  mime_type: string;
  url: string;
  viewer_url: string;
}

// ==========================================
// Módulo 4: Permisos de Carpetas y Usuarios
// ==========================================

export interface UserItem {
  id: number;
  username: string;
  role: 'admin' | 'editor' | 'reader' | string;
}

export interface UserFolderPermissionItem {
  folder_id: string;
  folder_name: string;
  allowed: boolean;
  reason?: 'assigned' | 'creator' | string;
}

export interface UpdateUserFolderPermissionsPayload {
  folder_ids: string[];
}

export interface UpdateFolderPermissionsPayload {
  allowed_user_ids?: number[];
  allowed_roles?: string[];
}

export interface CreateFolderPayload {
  name: string;
  parent_id?: string;
  allowed_user_ids?: number[];
  allowed_roles?: string[];
}


