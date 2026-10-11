export type SubmitAuditResponse = {
  audit_id?: number;
  status: string;
  message?: string;
  detection_reason?: string;
  [key: string]: unknown;
};

export type DetectionCoordinate = {
  label?: string;
  confidence?: number;
  bbox?: [number, number, number, number];
  [key: string]: unknown;
};

export type BrandCount = {
  brand?: string;
  name?: string;
  count?: number;
  [key: string]: unknown;
};

export type ProductCode = {
  id: number;
  product_code: string;
  description?: string | null;
  status?: string;
  created_at: string;
};

export type ProductCodePayload = {
  product_code: string;
  description?: string;
  status?: string;
};

export type AuditStatusResponse = {
  audit_id: number;
  status: string;
  error_message?: string | null;
  created_at?: string;
  product_code?: string;
  category?: string;
  result_json?: {
    product_image_url?: string;
    image_name?: string;
    total?: number;
    total_product_count?: number;
    total_self_count?: number;
    total_competition_count?: number;
    counts?: Record<string, number>;
    brand_counts?: BrandCount[];
    detected_products?: string[];
    detection_coordinates?: DetectionCoordinate[];
    detection_reason?: string;
    [key: string]: unknown;
  };
};

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
}

function buildUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

async function extractError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.message || data.detail || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function submitAuditByCode(productCode: string, imageUrl: string): Promise<SubmitAuditResponse> {
  const params = new URLSearchParams({
    product_code: productCode,
    image_url: imageUrl,
  });

  const response = await fetch(buildUrl(`/api/v1/audit/by-code?${params.toString()}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Submit failed (${response.status})`);
  }

  return response.json();
}

export type SubmitAuditBulkItem = {
  filename: string;
  audit_id?: number;
  status: string;
  message?: string;
  [key: string]: unknown;
};

export type SubmitAuditBulkResponse = SubmitAuditBulkItem[];


export async function submitAuditByUpload(productCode: string, file: File): Promise<SubmitAuditResponse> {
  const formData = new FormData();
  formData.append("product_code", productCode);
  formData.append("file", file);

  const response = await fetch(buildUrl("/api/v1/audit/by-code/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload submit failed (${response.status})`);
  }

  return response.json();
}

export async function submitAuditByUploadBulk(productCode: string, files: File[]): Promise<SubmitAuditBulkResponse> {
  const formData = new FormData();
  formData.append("product_code", productCode);
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(buildUrl("/api/v1/audit/by-code/upload-bulk"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Bulk upload submit failed (${response.status})`);
  }

  return response.json();
}

export async function getAuditStatus(auditId: number): Promise<AuditStatusResponse> {
  const response = await fetch(buildUrl(`/api/v1/audit/${auditId}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Status check failed (${response.status})`);
  }

  return response.json();
}

export async function deleteAudit(auditId: number): Promise<void> {
  const response = await fetch(buildUrl(`/api/v1/audit/${auditId}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Delete audit failed (${response.status})`));
  }
}

export async function listProductCodes(): Promise<ProductCode[]> {
  const response = await fetch(buildUrl("/api/v1/product-codes/?limit=200"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Product code list failed (${response.status})`));
  }

  return response.json();
}

export async function createProductCode(payload: ProductCodePayload): Promise<ProductCode> {
  const response = await fetch(buildUrl("/api/v1/product-codes/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Product code create failed (${response.status})`));
  }

  return response.json();
}

export async function updateProductCodeByName(currentCode: string, payload: ProductCodePayload): Promise<ProductCode> {
  const response = await fetch(buildUrl(`/api/v1/product-codes/by-code/${encodeURIComponent(currentCode)}`), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Product code update failed (${response.status})`));
  }

  return response.json();
}

export async function deleteProductCodeByName(productCode: string): Promise<void> {
  const response = await fetch(buildUrl(`/api/v1/product-codes/by-code/${encodeURIComponent(productCode)}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Product code delete failed (${response.status})`));
  }
}

export function resolveApiAssetUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/")) {
    return `${getApiBaseUrl()}${pathOrUrl}`;
  }
  return pathOrUrl;
}

// --- Extended API Client Types ---

export type Product = {
  id: number;
  product_code_id: number;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  ai_code?: string | null;
  type?: string | null;
  status: string;
  created_at: string;
};

export type ProductPayload = {
  product_code_id: number;
  product_name: string;
  brand?: string;
  category?: string;
  ai_code?: string;
  type?: string;
  status?: string;
};

export type BulkUploadResponse = {
  created: Product[];
  skipped: string[];
};

export type Model = {
  id: number;
  product_code_id: number;
  model_name: string;
  model_path: string;
  image_size?: number;
  conf_threshold?: number;
  iou_threshold?: number;
  is_active: boolean;
  created_at: string;
};

export type ModelPayload = {
  product_code_id: number;
  model_name: string;
  model_path: string;
  image_size?: number;
  conf_threshold?: number;
  iou_threshold?: number;
};

export type AuditLogItem = {
  id: number;
  audit_id: number;
  product_code: string | null;
  status: string;
  created_at: string;
  error_message?: string | null;
};

// --- Extended API Client Functions ---

export async function listAudits(
  productCode?: string,
  status?: string,
  skip = 0,
  limit = 50
): Promise<AuditLogItem[]> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  if (productCode) params.append("product_code", productCode);
  if (status) params.append("status", status);

  const response = await fetch(buildUrl(`/api/v1/audit/?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to list audits (${response.status})`);
  }
  return response.json();
}

export async function listProducts(skip = 0, limit = 100): Promise<Product[]> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  const response = await fetch(buildUrl(`/api/v1/products/?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to list products (${response.status})`);
  }
  return response.json();
}

export async function searchProducts(filters: {
  product_code_id?: number;
  name?: string;
  brand?: string;
  category?: string;
  type?: string;
  skip?: number;
  limit?: number;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.product_code_id !== undefined) params.append("product_code_id", String(filters.product_code_id));
  if (filters.name) params.append("name", filters.name);
  if (filters.brand) params.append("brand", filters.brand);
  if (filters.category) params.append("category", filters.category);
  if (filters.type) params.append("type", filters.type);
  if (filters.skip !== undefined) params.append("skip", String(filters.skip));
  if (filters.limit !== undefined) params.append("limit", String(filters.limit));

  const response = await fetch(buildUrl(`/api/v1/products/search/?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to search products (${response.status})`);
  }
  return response.json();
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const response = await fetch(buildUrl("/api/v1/products/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to create product (${response.status})`));
  }
  return response.json();
}

export async function updateProduct(id: number, payload: ProductPayload): Promise<Product> {
  const response = await fetch(buildUrl(`/api/v1/products/${id}`), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to update product (${response.status})`));
  }
  return response.json();
}

export async function deleteProduct(id: number): Promise<void> {
  const response = await fetch(buildUrl(`/api/v1/products/${id}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to delete product (${response.status})`));
  }
}

export async function bulkUploadProducts(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildUrl("/api/v1/products/bulk/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Bulk upload failed (${response.status})`));
  }
  return response.json();
}

export async function listModels(): Promise<Model[]> {
  const response = await fetch(buildUrl("/api/v1/models/"), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to list models (${response.status})`);
  }
  return response.json();
}

export async function createModel(payload: ModelPayload): Promise<Model> {
  const response = await fetch(buildUrl("/api/v1/models/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to create model (${response.status})`));
  }
  return response.json();
}

export async function updateModel(id: number, payload: ModelPayload): Promise<Model> {
  const response = await fetch(buildUrl(`/api/v1/models/${id}`), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to update model (${response.status})`));
  }
  return response.json();
}

export async function deleteModel(id: number): Promise<void> {
  const response = await fetch(buildUrl(`/api/v1/models/${id}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to delete model (${response.status})`));
  }
}

export async function toggleModelActive(id: number): Promise<Model> {
  const response = await fetch(buildUrl(`/api/v1/models/${id}/toggle-active`), {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to toggle model active (${response.status})`));
  }
  return response.json();
}

// New function to upload model weight file and register it
export async function uploadModel(
  file: File,
  product_code_id: number,
  model_name: string,
  folder_name: string,
  image_size = 640,
  conf_threshold = 0.45,
  iou_threshold = 0.45,
): Promise<Model> {
  const form = new FormData();
  form.append('file', file);
  form.append('product_code_id', String(product_code_id));
  form.append('model_name', model_name);
  form.append('folder_name', folder_name);
  form.append('image_size', String(image_size));
  form.append('conf_threshold', String(conf_threshold));
  form.append('iou_threshold', String(iou_threshold));
  const response = await fetch(buildUrl('/api/v1/models/upload'), {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    throw new Error(await extractError(response, `Model upload failed (${response.status})`));
  }
  return response.json();
}

// --- Audit Report Export API Helpers ---

export type AuditReportFilter = {
  product_code?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

export type AuditReportItem = {
  id: number;
  audit_id: number;
  product_code: string;
  status: string;
  created_at: string;
  error_message?: string | null;
  raw_image_url: string;
  detected_image_url: string;
  total_count: number;
  self_count: number;
  competition_count: number;
  confidence: number;
  counts: Record<string, number>;
};

export type AuditReportDataResponse = {
  summary: {
    total_audits: number;
    completed: number;
    failed: number;
    total_self: number;
    total_comp: number;
    avg_confidence: number;
  };
  audits: AuditReportItem[];
};

export function getAuditExportCsvUrl(filters?: AuditReportFilter): string {
  const params = new URLSearchParams();
  if (filters?.product_code) params.append("product_code", filters.product_code);
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.limit) params.append("limit", String(filters.limit));

  return buildUrl(`/api/v1/audit/export/csv?${params.toString()}`);
}

export function getAuditExportJsonUrl(filters?: AuditReportFilter): string {
  const params = new URLSearchParams();
  if (filters?.product_code) params.append("product_code", filters.product_code);
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.limit) params.append("limit", String(filters.limit));

  return buildUrl(`/api/v1/audit/export/json?${params.toString()}`);
}

export async function fetchAuditReportData(filters?: AuditReportFilter): Promise<AuditReportDataResponse> {
  const params = new URLSearchParams();
  if (filters?.product_code) params.append("product_code", filters.product_code);
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.start_date) params.append("start_date", filters.start_date);
  if (filters?.end_date) params.append("end_date", filters.end_date);
  if (filters?.limit) params.append("limit", String(filters.limit || 2000));

  const response = await fetch(buildUrl(`/api/v1/audit/export/report-data?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report data (${response.status})`);
  }

  return response.json();
}

