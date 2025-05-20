const slugify = (text = '') => {
  return text
    .toString()
    .normalize('NFKD') // convert accented chars
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = { slugify };