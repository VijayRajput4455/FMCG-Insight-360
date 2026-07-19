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
  created_at: string;
};

export type ProductCodePayload = {
  product_code: string;
  description?: string;
};

export type AuditStatusResponse = {
  audit_id: number;
  status: string;
  error_message?: string | null;
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function buildUrl(path: string): string {
  return `${API_BASE}${path}`;
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
    return `${API_BASE}${pathOrUrl}`;
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
  created_at: string;
};

export type ProductPayload = {
  product_code_id: number;
  product_name: string;
  brand?: string;
  category?: string;
  ai_code?: string;
  type?: string;
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
    method: "PATCH",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await extractError(response, `Failed to toggle model active status (${response.status})`));
  }
  return response.json();
}
