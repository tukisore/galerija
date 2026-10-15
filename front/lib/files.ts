/** Reads a file as a base64 data URL, the form the backend accepts as a media body. */
export function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** The parts of a media upload that come from the file itself. */
export async function toUpload(file: File) {
  return {
    filename: file.name,
    body: await readAsDataUrl(file),
    fileDate: new Date(file.lastModified).toISOString(),
  };
}

const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"];

export function isImage(filename: string) {
  return imageExtensions.includes(filename.split(".").pop()?.toLowerCase() ?? "");
}

export function isGpx(filename: string) {
  return filename.toLowerCase().endsWith(".gpx");
}

/** Where the backend serves the uploaded file of a media. */
export function fileUrl(mediaId: string) {
  return `/api/media/${mediaId}/file`;
}
