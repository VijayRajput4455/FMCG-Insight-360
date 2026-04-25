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
    const data = (await response.json()) as { detail?: string };
    return data.detail || fallbackMessage;
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
