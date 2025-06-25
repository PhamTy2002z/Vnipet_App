/* Lấy base URL chuẩn có https:// và bỏ dấu / cuối */
module.exports.getBaseUrl = () => {
    const raw = process.env.BASE_URL;
    if (!raw) throw new Error('BASE_URL env missing');
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return withProto.replace(/\/$/, '');
  };
  