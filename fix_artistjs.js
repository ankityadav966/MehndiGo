const fs = require('fs');

const file = 'mobile/src/services/artist.js';
let content = fs.readFileSync(file, 'utf8');

const mangledStart = `    const response = await FileSystem.uploadAsync(endpoint, cleanUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "media",
      mimeType: mimeType || "image/jpeg",
      headers: token ? { Authorization: \`Bearer \${token}\` } : {}
    });

    const token = await secureStorage.getAccessToken();
    const url = getNormalizedUrl("/api/v1/mehndigo/artist/portfolio");
    console.log(\`[API REQUEST] POST (uploadAsync) -> \${url}\`);
    const response = await FileSystem.uploadAsync(
      url,
      mediaUri,
      {
        fieldName: "portfolio_image",
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        headers: token ? { Authorization: \`Bearer \${token}\` } : {},
        parameters: params,
        mimeType: isVideo ? "video/mp4" : "image/jpeg"
      }
    );

    let data;
    try {
      data = JSON.parse(response.body);
    } catch {
      data = { message: response.body };
    }


    if (response.status < 200 || response.status >= 300) {`;

const correctCode = `    const response = await FileSystem.uploadAsync(endpoint, cleanUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "media",
      mimeType: mimeType || "image/jpeg",
      headers: token ? { Authorization: \`Bearer \${token}\` } : {}
    });

    if (response.status < 200 || response.status >= 300) {`;

content = content.replace(mangledStart, correctCode);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed artist.js');
