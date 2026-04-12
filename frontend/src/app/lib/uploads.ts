import { getApiUrl } from "../config/api";
import { getAuthHeaders } from "./auth";

/**
 * Tipo de imagem retornada após upload bem-sucedido
 */
export interface UploadedImage {
  imagemId: number;     // ID da imagem no banco de dados
  url: string;          // URL da imagem no Cloudinary
  publicId: string;     // ID público no Cloudinary
}

/**
 * Faz upload de imagem para Cloudinary com classificação por pasta
 * 
 * @param file - Arquivo de imagem a ser enviado
 * @param type - Tipo de imagem: "idosos" | "instituicoes" 
 *               Determina a pasta no Cloudinary (home/geras/idosos ou home/geras/instituicoes)
 * @returns Promessa com dados da imagem armazenada
 * @throws Erro se o upload falhar ou resposta for inválida
 * 
 * @example
 * const idosoFoto = await uploadImageToCloudinary(file, "idosos");
 * const instituicaoLogo = await uploadImageToCloudinary(file, "instituicoes");
 */
export async function uploadImageToCloudinary(
  file: File,
  type: "idosos" | "instituicoes"
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("type", type);

  const response = await fetch(getApiUrl("/api/uploads/image"), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  // A API pode responder JSON de erro ou texto/HTML; tratamos os dois cenarios.
  const rawBody = await response.text();
  let data: any = null;

  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const apiMessage = data?.message;
    throw new Error(apiMessage || `Falha no upload da imagem (HTTP ${response.status}).`);
  }

  if (!data?.imagem?.id || !data?.imagem?.url || !data?.imagem?.publicId) {
    throw new Error("Resposta de upload invalida.");
  }

  return {
    imagemId: data.imagem.id,
    url: data.imagem.url,
    publicId: data.imagem.publicId,
  };
}
